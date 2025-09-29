package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	// "log" // Can be used for more detailed error logging if needed
)

const (
	configFileName = ".templui.json"
	manifestPath   = "internal/manifest.json" // Path to the manifest within the repository
	// Base URL for fetching raw file content.
	// Needs adjustment if the repository location changes.
	rawContentBaseURL = "https://raw.githubusercontent.com/templui/templui/"
)

// version of the tool (can be set during build with ldflags).
var version = "v0.97.0"

// getDefaultRef returns the current stable version
// Uses the same version as the CLI tool itself for consistency
func getDefaultRef() string {
	return version
}

// versionRegex extracts the version ref from the component/util file comment.
var versionRegex = regexp.MustCompile(`(?m)^\s*//\s*templui\s+(?:component|util)\s+.*\s+-\s+version:\s+(\S+)`)

// Flags defined for the command line interface.
var forceOverwrite = flag.Bool("force", false, "Force overwrite existing files without asking")
var versionFlag = flag.Bool("version", false, "Show installer version")
var helpFlag = flag.Bool("help", false, "Show this help message")

// Config defines the structure for the .templui.json file.
type Config struct {
	ComponentsDir string `json:"componentsDir"`
	UtilsDir      string `json:"utilsDir"`
	ModuleName    string `json:"moduleName"`
	JSDir         string `json:"jsDir,omitempty"`        // Directory for component JavaScript files
	JSPublicPath  string `json:"jsPublicPath,omitempty"` // Public path where JS files are served (e.g., "/app/assets/js")
}

// Manifest defines the structure of the manifest.json file.
type Manifest struct {
	Version    string         `json:"version"`
	Components []ComponentDef `json:"components"`
	Utils      []UtilDef      `json:"utils"`
}

// ComponentDef describes a single component within the manifest.
type ComponentDef struct {
	Name          string   `json:"name"`
	Description   string   `json:"description"`
	Files         []string `json:"files"`           // Paths relative to the repository root
	Dependencies  []string `json:"dependencies"`    // Names of other required components
	RequiredUtils []string `json:"requiredUtils"`   // Paths to required utils relative to the repository root
	HasJS         bool     `json:"hasJS,omitempty"` // Whether this component requires JavaScript
}

// UtilDef describes a single utility file within the manifest.
type UtilDef struct {
	Path        string `json:"path"` // Path relative to the repository root
	Description string `json:"description"`
}

func main() {
	// Define a shorthand -f for the --force flag.
	flag.BoolVar(forceOverwrite, "f", false, "Force overwrite existing files without asking (shorthand)")

	// Define version flags
	flag.BoolVar(versionFlag, "v", false, "Show installer version")
	flag.BoolVar(helpFlag, "h", false, "Show this help message")

	// Set a custom usage function to show our specific help message.
	flag.Usage = func() {
		showHelp(nil, getDefaultRef())
	}
	flag.Parse() // Parse command line flags first.

	// Handle version display.
	if *versionFlag {
		fmt.Printf("templUI %s\n", version)
		return
	}

	// Handle help display.
	if *helpFlag {
		fmt.Println("Fetching manifest for help...")
		manifest, err := fetchManifest(getDefaultRef())
		if err != nil {
			fmt.Println("Could not fetch component list for help:", err)
			showHelp(nil, getDefaultRef())
		} else {
			showHelp(&manifest, getDefaultRef())
		}
		return
	}

	args := flag.Args() // Get the remaining non-flag arguments.

	if len(args) == 0 {
		fmt.Println("No command specified.")
		showHelp(nil, getDefaultRef())
		return
	}

	commandArg := args[0] // The command is the first non-flag argument.

	// Handle the 'init' command.
	if strings.HasPrefix(commandArg, "init") {
		initRef := getDefaultRef()

		// Parse optional @ref from the command argument itself.
		if strings.Contains(commandArg, "@") {
			parts := strings.SplitN(commandArg, "@", 2)
			if len(parts) == 2 && parts[0] == "init" && parts[1] != "" {
				initRef = parts[1]
				fmt.Printf("Initializing using specified ref: %s\n", initRef)
			} else {
				fmt.Printf("Error: Invalid format '%s'. Use 'init' or 'init@<ref>'.\n", commandArg)
				return
			}
		} else if commandArg != "init" {
			fmt.Printf("Error: Unknown command '%s'. Did you mean 'init'?\n", commandArg)
			showHelp(nil, getDefaultRef())
			return
		}

		// Warn about extra arguments.
		if len(args) > 1 {
			fmt.Printf("Warning: Extra arguments found after '%s'. Ignoring: %v\n", commandArg, args[1:])
		}

		initConfig(initRef, *forceOverwrite) // Pass ref and force status.
		return
	}

	// Handle the 'add' command.
	if strings.HasPrefix(commandArg, "add") {
		targetRef := getDefaultRef()
		commandRefProvided := false

		// Parse optional @ref from the command argument.
		if strings.Contains(commandArg, "@") {
			parts := strings.SplitN(commandArg, "@", 2)
			if len(parts) == 2 && parts[0] == "add" && parts[1] != "" {
				targetRef = parts[1]
				commandRefProvided = true
				fmt.Printf("Using specified ref from command: %s\n", targetRef)
			} else {
				fmt.Printf("Error: Invalid format '%s'. Use 'add' or 'add@<ref>'.\n", commandArg)
				return
			}
		} else if commandArg != "add" {
			fmt.Printf("Error: Unknown command '%s'. Did you mean 'add'?\n", commandArg)
			showHelp(nil, getDefaultRef())
			return
		}

		// Ensure component arguments are provided after the command.
		if len(args) < 2 {
			fmt.Println("Error: No component(s) specified after 'add'.")
			fmt.Println("Usage: templui add[@<ref>] <component>... | *")
			return
		}

		// Load user configuration.
		config, err := loadConfig()
		if err != nil {
			fmt.Printf("Error loading config: %v\n", err)
			return
		}

		// Parse component arguments (start from the second non-flag argument).
		componentsToInstallNames := []string{}
		isInstallAll := false

		firstCompArg := args[1]
		if firstCompArg == "*" {
			if len(args) > 2 { // Only '*' allowed after 'add[*]' command.
				fmt.Println("Error: '*' must be the only component argument after 'add'.")
				fmt.Println("Usage: templui add[@<ref>] *")
				return
			}
			isInstallAll = true
		} else {
			// Parse individual component names.
			for _, arg := range args[1:] {
				// Disallow @ref on individual components if ref was given with the command.
				if strings.Contains(arg, "@") {
					compName := strings.SplitN(arg, "@", 2)[0]
					if commandRefProvided {
						fmt.Printf("Warning: Ignoring '@...' for component '%s' because ref '%s' was specified with the 'add' command.\n", compName, targetRef)
						componentsToInstallNames = append(componentsToInstallNames, compName)
					} else {
						// Enforce specifying the ref only with the 'add' command itself.
						fmt.Printf("Error: Specify the ref with the 'add' command (e.g., 'add@%s %s'), not on individual components like '%s'.\n", targetRef, compName, arg)
						return
					}
				} else {
					componentsToInstallNames = append(componentsToInstallNames, arg)
				}
			}
		}

		// Fetch the manifest for the target ref.
		fmt.Printf("\n📦 Using ref: %s\n", targetRef)
		fmt.Printf("🔍 Fetching component manifest from ref '%s'...\n", targetRef)
		manifest, err := fetchManifest(targetRef)
		if err != nil {
			if strings.Contains(err.Error(), "status code 404") {
				fmt.Printf("❌ Error fetching manifest: %v\n", err)
				fmt.Printf("   Check if the ref '%s' exists and contains the file '%s'.\n", targetRef, manifestPath)
				fmt.Printf("   Manifest URL attempted: %s%s/%s\n", rawContentBaseURL, targetRef, manifestPath)
			} else {
				fmt.Printf("❌ Error fetching manifest: %v\n", err)
			}
			return
		}
		fmt.Printf("✅ Using components from templui manifest version %s (fetched from ref %s)\n", manifest.Version, targetRef)

		// Build a map for quick component lookup.
		componentMap := make(map[string]ComponentDef)
		for _, comp := range manifest.Components {
			componentMap[comp.Name] = comp
		}

		// If '*' was requested, get all component names from the manifest.
		if isInstallAll {
			fmt.Printf("\n🚀 Preparing to install all %d components...\n", len(manifest.Components))
			componentsToInstallNames = []string{}
			for _, comp := range manifest.Components {
				componentsToInstallNames = append(componentsToInstallNames, comp.Name)
			}
		}

		fmt.Print("\n" + strings.Repeat("─", 50) + "\n")
		fmt.Printf("🔧 INSTALLING COMPONENTS\n")
		fmt.Printf("%s\n", strings.Repeat("─", 50))

		// Track installed state and required utils for this run.
		installedComponents := make(map[string]bool)
		requiredUtils := make(map[string]bool)

		// Install each requested component and its dependencies.
		for _, componentName := range componentsToInstallNames {
			compDef, exists := componentMap[componentName]
			if !exists {
				fmt.Printf("❌ Component '%s' not found in manifest for ref '%s'.\n", componentName, targetRef)
				fmt.Println("Available components in this manifest:")
				for _, availableComp := range manifest.Components {
					fmt.Printf("   • %s\n", availableComp.Name)
				}
				continue // Skip to next requested component
			}

			// Pass the force flag down to the installation function.
			err = installComponent(config, compDef, componentMap, targetRef, installedComponents, requiredUtils, *forceOverwrite)
			if err != nil {
				fmt.Printf("❌ Error installing component %s: %v\n", componentName, err)
				// Decide whether to continue or stop on error
			}
		}

		// Install all collected required utils.
		if len(requiredUtils) > 0 {
			fmt.Printf("\n🛠️  Installing required utils...\n")
			utilsToInstallPaths := []string{}
			for utilPath := range requiredUtils {
				utilsToInstallPaths = append(utilsToInstallPaths, utilPath)
			}
			// Pass the force flag down.
			err = installUtils(config, utilsToInstallPaths, targetRef, *forceOverwrite)
			if err != nil {
				fmt.Printf("❌ Error installing utils: %v\n", err)
			}
		}

		fmt.Print("\n" + strings.Repeat("─", 50) + "\n")
		fmt.Printf("✅ INSTALLATION COMPLETED\n")
		fmt.Printf("%s\n", strings.Repeat("─", 50))

		// Check if any installed components have JavaScript
		hasJSComponents := false
		for compName := range installedComponents {
			if comp, exists := componentMap[compName]; exists && comp.HasJS {
				hasJSComponents = true
				break
			}
		}

		if hasJSComponents {
			fmt.Println("\n💡 Tip: Some components require JavaScript. Make sure to include @component.Script() in your layout!")
		}
		return
	}

	// Handle the 'list' command.
	if strings.HasPrefix(commandArg, "list") {
		listRef := getDefaultRef()

		// Parse optional @ref from the command argument.
		if strings.Contains(commandArg, "@") {
			parts := strings.SplitN(commandArg, "@", 2)
			if len(parts) == 2 && parts[0] == "list" && parts[1] != "" {
				listRef = parts[1]
				fmt.Printf("Listing components using specified ref: %s\n", listRef)
			} else {
				fmt.Printf("Error: Invalid format '%s'. Use 'list' or 'list@<ref>'.\n", commandArg)
				return
			}
		} else if commandArg != "list" {
			fmt.Printf("Error: Unknown command '%s'. Did you mean 'list'?\n", commandArg)
			showHelp(nil, getDefaultRef())
			return
		}

		// Warn about extra arguments.
		if len(args) > 1 {
			fmt.Printf("Warning: Extra arguments found after '%s'. Ignoring: %v\n", commandArg, args[1:])
		}

		err := listComponents(listRef)
		if err != nil {
			fmt.Printf("Error listing components: %v\n", err)
		}
		return
	}

	// Handle the 'upgrade' command.
	if strings.HasPrefix(commandArg, "upgrade") {
		var ref string

		if strings.Contains(commandArg, "@") {
			parts := strings.SplitN(commandArg, "@", 2)
			if len(parts) == 2 && parts[0] == "upgrade" && parts[1] != "" {
				ref = parts[1]
				fmt.Printf("Updating templUI cli using specified ref: %s\n", ref)
			} else {
				fmt.Printf("Error: Invalid format '%s'. Use 'upgrade' or 'upgrade@<ref>'.\n", commandArg)
				return
			}
		}

		if err := updateCLI(ref); err != nil {
			fmt.Printf("Error upgrading templUI cli: %v\n", err)
		}
		return
	}

	// Fallback for unknown commands.
	fmt.Printf("Error: Unknown command '%s'\n", commandArg)
	showHelp(nil, getDefaultRef())
}

// showHelp displays the command usage instructions.
func showHelp(manifest *Manifest, refUsedForHelp string) {
	fmt.Println("templUI " + version + " - The UI Kit for templ" + "\n")
	fmt.Println("Usage:")
	fmt.Println("  templui init[@<ref>]                - Initialize config and install utils from <ref>")
	fmt.Println("  templui -f init[@<ref>]             - Force reinitialize and repair incomplete config")
	fmt.Println("  templui add[@<ref>] <comp>...       - Add or update component(s) from specified <ref>")
	fmt.Println("  templui add[@<ref>] \"*\"           - Add all components from specified <ref>")
	fmt.Println("  templui list[@<ref>]                - List available components and utils from <ref>")
	fmt.Println("  templui upgrade[@<ref>]             - Upgrades the cli to <ref> or latest if no <ref> was given")
	fmt.Println("  templui -v, --version               - Show installer version")
	fmt.Println("  templui -h, --help                  - Show this help message")
	fmt.Println("\n<ref> can be a branch name, tag name, or commit hash.")
	fmt.Printf("If no <ref> is specified, components are fetched from the default ref (currently '%s').\n", refUsedForHelp)
	fmt.Println("\nFlags:")
	flag.PrintDefaults() // Display defined flags (-f, --force).

	// Show component/util list only if -h was used and manifest was fetched.
	if manifest != nil {
		if len(manifest.Components) > 0 {
			fmt.Printf("\nAvailable components in manifest (fetched from ref '%s'):\n", refUsedForHelp)
			for _, comp := range manifest.Components {
				desc := comp.Description
				if len(desc) > 60 {
					desc = desc[:57] + "..."
				}
				fmt.Printf("  - %-15s: %s\n", comp.Name, desc)
			}
		} else {
			fmt.Printf("\nNo components found in manifest for ref '%s'.\n", refUsedForHelp)
		}
		if len(manifest.Utils) > 0 {
			fmt.Printf("\nAvailable utils in ref '%s':\n", refUsedForHelp)
			for _, util := range manifest.Utils {
				utilName := filepath.Base(util.Path)
				if util.Description != "" {
					desc := util.Description
					if len(desc) > 50 {
						desc = desc[:47] + "..."
					}
					fmt.Printf("  - %-20s : %s\n", utilName, desc)
				} else {
					fmt.Printf("  - %s\n", utilName)
				}
			}
		}
	} else {
		// Hint for users who call the tool without arguments.
		fmt.Println("\nUse 'templui list' or 'templui list@<ref>' to see available components and utils.")
	}
}

// initConfig handles the creation of the config file and initial utils installation.
func initConfig(ref string, force bool) {
	configExists := false
	if _, err := os.Stat(configFileName); err == nil {
		configExists = true
	}

	if configExists {
		// Config exists - check if it needs repair or if force is specified
		if !force {
			// Check if existing config has missing fields
			_, err := loadConfig()
			if err != nil {
				fmt.Println("Config file exists but has issues. Use 'templui -f init' to repair missing fields and reinstall utils.")
				return
			}
			fmt.Println("Config file already exists and is complete. Use 'templui -f init' to reinstall utils if needed.")
			// Don't reinstall utils unless forced
			return
		} else {
			fmt.Println("Config file exists. Checking for missing fields and reinstalling utils (--force specified)...")

			// Try to load existing config and repair missing fields
			_, err := loadConfig()
			if err != nil {
				fmt.Println("Repairing config file with missing fields...")

				// Load partial config to see what we have
				var partialConfig Config
				if configData, readErr := os.ReadFile(configFileName); readErr == nil {
					json.Unmarshal(configData, &partialConfig)
				}

				// Prompt for missing fields
				if partialConfig.ComponentsDir == "" {
					fmt.Printf("Enter the directory for components [components]: ")
					var componentsDir string
					fmt.Scanln(&componentsDir)
					if componentsDir == "" {
						componentsDir = "components"
					}
					partialConfig.ComponentsDir = componentsDir
				}

				if partialConfig.UtilsDir == "" {
					fmt.Printf("Enter the directory for utils [utils]: ")
					var utilsDir string
					fmt.Scanln(&utilsDir)
					if utilsDir == "" {
						utilsDir = "utils"
					}
					partialConfig.UtilsDir = utilsDir
				}

				if partialConfig.ModuleName == "" {
					defaultModuleName := detectModuleName()
					fmt.Printf("Enter your Go module name [%s]: ", defaultModuleName)
					var moduleName string
					fmt.Scanln(&moduleName)
					if moduleName == "" {
						moduleName = defaultModuleName
					}
					partialConfig.ModuleName = moduleName
				}

				if partialConfig.JSDir == "" {
					fmt.Printf("Enter the directory for JavaScript files [assets/js]: ")
					var jsDir string
					fmt.Scanln(&jsDir)
					if jsDir == "" {
						jsDir = "assets/js"
					}
					partialConfig.JSDir = jsDir
				}

				// JSPublicPath is optional - if not set, we'll use a fallback
				if partialConfig.JSPublicPath == "" && partialConfig.JSDir != "" {
					defaultPublicPath := "/" + partialConfig.JSDir
					fmt.Printf("Enter the public path for serving JS files [%s]: ", defaultPublicPath)
					var jsPublicPath string
					fmt.Scanln(&jsPublicPath)
					if jsPublicPath == "" {
						jsPublicPath = defaultPublicPath
					}
					partialConfig.JSPublicPath = jsPublicPath
				}

				// Save repaired config
				data, err := json.MarshalIndent(partialConfig, "", "  ")
				if err != nil {
					fmt.Printf("Error creating config data: %v\n", err)
					return
				}
				err = os.WriteFile(configFileName, data, 0644)
				if err != nil {
					fmt.Printf("Error saving repaired config file: %v\n", err)
					return
				}
				fmt.Println("Config file repaired successfully!")
			} else {
				fmt.Println("Config file is already complete.")
			}
		}
	} else {
		// Config file does not exist, create it.
		fmt.Println("Creating new config file...")

		// Defaults for prompts - no leading ./ for cleaner DX and no dynamic derivation for utilsDir from componentsDir.
		initialPromptComponentsDir := "components"
		initialPromptUtilsDir := "utils" // Fixed default, independent of componentsDir
		defaultModuleName := detectModuleName()

		// Prompt user for configuration values.
		fmt.Printf("Enter the directory for components [%s]: ", initialPromptComponentsDir)
		var componentsDir string
		fmt.Scanln(&componentsDir)
		if componentsDir == "" {
			componentsDir = initialPromptComponentsDir
		} else if strings.HasPrefix(componentsDir, "/") {
			originalPath := componentsDir
			componentsDir = strings.TrimPrefix(componentsDir, "/")
			fmt.Printf("Hint: Absolute path '%s' detected. Using relative path '%s' to avoid potential permission issues.\n", originalPath, componentsDir)
		}

		fmt.Printf("Enter the directory for utils [%s]: ", initialPromptUtilsDir)
		var utilsDir string
		fmt.Scanln(&utilsDir)
		if utilsDir == "" {
			utilsDir = initialPromptUtilsDir
		} else if strings.HasPrefix(utilsDir, "/") {
			originalPath := utilsDir
			utilsDir = strings.TrimPrefix(utilsDir, "/")
			fmt.Printf("Hint: Absolute path '%s' detected. Using relative path '%s' to avoid potential permission issues.\n", originalPath, utilsDir)
		}

		fmt.Printf("Enter your Go module name [%s]: ", defaultModuleName)
		var moduleName string
		fmt.Scanln(&moduleName)
		if moduleName == "" {
			moduleName = defaultModuleName
		}

		fmt.Printf("Enter the directory for JavaScript files [assets/js]: ")
		var jsDir string
		fmt.Scanln(&jsDir)
		if jsDir == "" {
			jsDir = "assets/js"
		} else if strings.HasPrefix(jsDir, "/") {
			originalPath := jsDir
			jsDir = strings.TrimPrefix(jsDir, "/")
			fmt.Printf("Hint: Absolute path '%s' detected. Using relative path '%s' to avoid potential permission issues.\n", originalPath, jsDir)
		}

		fmt.Printf("Enter the public path for serving JS files [/%s]: ", jsDir)
		var jsPublicPath string
		fmt.Scanln(&jsPublicPath)
		if jsPublicPath == "" {
			jsPublicPath = "/" + jsDir
		}

		config := Config{
			ComponentsDir: componentsDir,
			UtilsDir:      utilsDir,
			ModuleName:    moduleName,
			JSDir:         jsDir,
			JSPublicPath:  jsPublicPath,
		}

		data, err := json.MarshalIndent(config, "", "  ")
		if err != nil {
			fmt.Printf("Error creating config data: %v\n", err)
			return
		}
		err = os.WriteFile(configFileName, data, 0644)
		if err != nil {
			fmt.Printf("Error saving config file: %v\n", err)
			return
		}
		fmt.Println("Config file created successfully at", configFileName)
		fmt.Printf("Components will be installed to: %s\n", config.ComponentsDir)
		fmt.Printf("Utils will be installed to: %s\n", config.UtilsDir)
		fmt.Printf("Using module name: %s\n", config.ModuleName)
		fmt.Printf("JavaScript files will be saved to: %s\n", config.JSDir)
		if config.JSPublicPath != "" {
			fmt.Printf("JavaScript files will be served from: %s\n", config.JSPublicPath)
		}
	}

	// Only install utils if we created a new config or if force was specified
	if !configExists || force {
		// Install the default utilities.
		config, err := loadConfig()
		if err != nil {
			fmt.Printf("Error loading config: %v\n", err)
			return
		}

		// Install all available utils from the specified ref.
		fmt.Printf("\nAttempting to install initial utils from ref '%s'...\n", ref)
		manifest, err := fetchManifest(ref)
		if err != nil {
			if strings.Contains(err.Error(), "status code 404") {
				fmt.Printf("Warning: Could not fetch manifest from ref '%s': %v\n", ref, err)
				fmt.Printf("  Check if the ref '%s' exists and contains the file '%s'.\n", ref, manifestPath)
			} else {
				fmt.Printf("Warning: Could not fetch manifest to install initial utils: %v\n", err)
			}
			return
		}

		if len(manifest.Utils) == 0 {
			fmt.Println("No utils defined in the manifest. Skipping initial utils installation.")
			return
		}

		allUtilPaths := []string{}
		fmt.Println("Found utils in manifest:")
		for _, utilDef := range manifest.Utils {
			allUtilPaths = append(allUtilPaths, utilDef.Path)
			fmt.Printf(" - %s\n", utilDef.Path)
		}

		// Pass the force flag from the init command.
		err = installUtils(config, allUtilPaths, ref, force)
		if err != nil {
			fmt.Printf("Error during initial utils installation: %v\n", err)
		} else {
			fmt.Println("Initial utils installation completed.")
		}
	}
}

// detectModuleName tries to read the module name from go.mod.
func detectModuleName() string {
	data, err := os.ReadFile("go.mod")
	if err != nil {
		fmt.Println("Warning: Could not read go.mod to detect module name. Using default.")
		return "your/module/path" // Provide a fallback placeholder
	}
	re := regexp.MustCompile(`(?m)^\s*module\s+(\S+)`)
	matches := re.FindSubmatch(data)
	if len(matches) < 2 {
		fmt.Println("Warning: Could not parse module name from go.mod. Using default.")
		return "your/module/path"
	}
	return string(matches[1])
}

// loadConfig reads and parses the .templui.json configuration file.
// Returns an error if the config file doesn't exist or required fields are missing.
func loadConfig() (Config, error) {
	var config Config

	// Check if config file exists
	if _, err := os.Stat(configFileName); os.IsNotExist(err) {
		return config, fmt.Errorf("🚫 Config file not found!\n📁 Looking for: %s\n\n🚀 To get started, run: templui init", configFileName)
	}

	// Read and parse existing config file
	data, err := os.ReadFile(configFileName)
	if err != nil {
		return config, fmt.Errorf("error reading config file: %w", err)
	}

	err = json.Unmarshal(data, &config)
	if err != nil {
		return config, fmt.Errorf("error parsing config file: %w", err)
	}

	// Validate required fields
	var missingFields []string
	if config.ComponentsDir == "" {
		missingFields = append(missingFields, "componentsDir")
	}
	if config.UtilsDir == "" {
		missingFields = append(missingFields, "utilsDir")
	}
	if config.ModuleName == "" {
		missingFields = append(missingFields, "moduleName")
	}
	if config.JSDir == "" {
		missingFields = append(missingFields, "jsDir")
	}
	if config.JSPublicPath == "" {
		missingFields = append(missingFields, "jsPublicPath")
	}

	if len(missingFields) > 0 {
		var errorMsg strings.Builder
		errorMsg.WriteString("❌ Config file is incomplete!\n")
		errorMsg.WriteString("📋 Missing required fields:\n")
		for _, field := range missingFields {
			errorMsg.WriteString(fmt.Sprintf("   • %s\n", field))
		}
		errorMsg.WriteString("\n🔧 To fix this, run: templui -f init")
		return config, fmt.Errorf("%s", errorMsg.String())
	}

	return config, nil
}

// fetchManifest downloads and parses the manifest.json file for a given git ref.
func fetchManifest(ref string) (Manifest, error) {
	manifestURL := rawContentBaseURL + ref + "/" + manifestPath
	resp, err := http.Get(manifestURL)
	if err != nil {
		return Manifest{}, fmt.Errorf("failed to start download: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return Manifest{}, fmt.Errorf("failed to download manifest from %s: status code %d, message: %s", manifestURL, resp.StatusCode, string(bodyBytes))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return Manifest{}, fmt.Errorf("failed to read response body: %w", err)
	}

	var manifest Manifest
	err = json.Unmarshal(body, &manifest)
	if err != nil {
		return Manifest{}, fmt.Errorf("failed to parse manifest JSON (from %s): %w", manifestURL, err)
	}

	return manifest, nil
}

// downloadFile fetches the content of a single file from a URL.
func downloadFile(url string) ([]byte, error) {
	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to start download from %s: %w", url, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to download file from %s: status code %d, message: %s", url, resp.StatusCode, string(bodyBytes))
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body from %s: %w", url, err)
	}
	return data, nil
}

// installComponent handles the installation of a single component and its dependencies.
func installComponent(
	config Config,
	comp ComponentDef,
	componentMap map[string]ComponentDef,
	ref string,
	installed map[string]bool,
	requiredUtils map[string]bool,
	force bool,
) error {
	if installed[comp.Name] {
		return nil // Already processed in this run
	}
	installed[comp.Name] = true

	fmt.Printf("\n📦 Processing component: %s (from ref: %s)\n", comp.Name, ref)

	// Install dependencies first recursively.
	for _, depName := range comp.Dependencies {
		if installed[depName] {
			continue
		}
		depComp, exists := componentMap[depName]
		if !exists {
			fmt.Printf("Warning: Dependency '%s' for component '%s' not found in manifest for ref '%s'. Skipping dependency.\n", depName, comp.Name, ref)
			continue
		}
		// Pass force flag to recursive calls.
		err := installComponent(config, depComp, componentMap, ref, installed, requiredUtils, force)
		if err != nil {
			return fmt.Errorf("failed to install dependency '%s' for '%s': %w", depName, comp.Name, err)
		}
		fmt.Printf("   ✅ Installed dependency: %s\n", depName)
	}

	// Download and write component files.
	fmt.Printf("   📁 Installing files for: %s\n", comp.Name)
	repoComponentBasePath := "internal/components/"

	for _, repoFilePath := range comp.Files {
		// Determine the destination path, preserving subdirectory structure.
		var destPath string
		if strings.HasPrefix(repoFilePath, repoComponentBasePath) {
			relativePath := repoFilePath[len(repoComponentBasePath):]
			destPath = filepath.Join(config.ComponentsDir, relativePath)
		} else {
			// Fallback for unexpected paths (shouldn't happen with proper manifest).
			fmt.Printf("  Warning: File path '%s' does not start with '%s'. Placing it directly in '%s'.\n", repoFilePath, repoComponentBasePath, config.ComponentsDir)
			fileName := filepath.Base(repoFilePath)
			destPath = filepath.Join(config.ComponentsDir, fileName)
		}

		// Ensure the destination directory exists.
		compDestDir := filepath.Dir(destPath)
		err := os.MkdirAll(compDestDir, 0755)
		if err != nil {
			return fmt.Errorf("failed to create destination directory '%s': %w", compDestDir, err)
		}

		// Check if file exists and handle overwrite logic.
		fileExists := false
		if _, err := os.Stat(destPath); err == nil {
			fileExists = true
		}

		shouldWriteFile := true // Assume write unless file exists and is up-to-date or user skips.

		if fileExists {
			existingRef, _ := readFileVersion(destPath)
			if existingRef == ref {
				// File is up-to-date, but check if force flag is set
				if force {
					fmt.Printf("      ⚠️  File '%s' already up-to-date (ref: %s). Forcing overwrite.\n", destPath, ref)
				} else {
					fmt.Printf("      ℹ️  File '%s' already up-to-date (ref: %s). Skipping.\n", destPath, ref)
					shouldWriteFile = false
				}
			} else {
				// Versions differ or existing version couldn't be read.
				if force {
					fmt.Printf("      ⚠️  File '%s' exists (Version: '%s'). Forcing overwrite with ref '%s'.\n", destPath, existingRef, ref)
				} else {
					shouldOverwrite := askForOverwrite(destPath, existingRef, ref)
					if !shouldOverwrite {
						fmt.Printf("      ⏭️  Skipping overwrite for '%s'.\n", destPath)
						shouldWriteFile = false
					}
				}
			}
		}

		// Proceed with download and write only if necessary.
		if shouldWriteFile {
			fileURL := rawContentBaseURL + ref + "/" + repoFilePath
			fmt.Printf("      ⬇️  Downloading %s...\n", fileURL)
			data, err := downloadFile(fileURL)
			if err != nil {
				fileNameForError := filepath.Base(repoFilePath)
				return fmt.Errorf("failed to download file '%s' for component '%s' from %s: %w", fileNameForError, comp.Name, fileURL, err)
			}

			// Add version comment and replace imports.
			versionComment := fmt.Sprintf("// templui component %s - version: %s installed by templui %s\n", comp.Name, ref, version)
			modifiedData := append([]byte(versionComment), data...)
			if strings.HasSuffix(repoFilePath, ".templ") || strings.HasSuffix(repoFilePath, ".go") {
				modifiedData = replaceImports(modifiedData, config, comp.Name)
			}

			// Write the file.
			err = os.WriteFile(destPath, modifiedData, 0644)
			if err != nil {
				return fmt.Errorf("failed to write file '%s': %w", destPath, err)
			}
			if fileExists {
				fmt.Printf("      ✅ Overwritten %s\n", destPath)
			} else {
				fmt.Printf("      ✅ Installed %s\n", destPath)
			}
		}
	}

	// Collect required utils for later installation.
	for _, repoUtilPath := range comp.RequiredUtils {
		requiredUtils[repoUtilPath] = true
	}

	// Handle JavaScript files if component requires them
	if comp.HasJS && config.JSDir != "" {
		err := installComponentJS(config, comp, ref, force)
		if err != nil {
			return fmt.Errorf("failed to install JavaScript for component '%s': %w", comp.Name, err)
		}
	}

	return nil
}

// installUtils handles the installation of required utility files.
func installUtils(config Config, utilPaths []string, ref string, force bool) error {
	if len(utilPaths) == 0 {
		return nil
	}

	utilsBaseDestDir := config.UtilsDir
	fmt.Printf("Ensuring utils are installed in: %s (from ref: %s)\n", utilsBaseDestDir, ref)
	repoUtilBasePath := "internal/utils/"

	// Ensure base utils directory exists.
	err := os.MkdirAll(utilsBaseDestDir, 0755)
	if err != nil {
		return fmt.Errorf("failed to create base utils directory '%s': %w", utilsBaseDestDir, err)
	}

	for _, repoUtilPath := range utilPaths {
		// Determine destination path, preserving subdirectory structure.
		var destPath string
		if strings.HasPrefix(repoUtilPath, repoUtilBasePath) {
			relativePath := repoUtilPath[len(repoUtilBasePath):]
			destPath = filepath.Join(utilsBaseDestDir, relativePath)
		} else {
			fmt.Printf("  Warning: Util path '%s' does not start with '%s'. Placing it directly in '%s'.\n", repoUtilPath, repoUtilBasePath, utilsBaseDestDir)
			fileName := filepath.Base(repoUtilPath)
			destPath = filepath.Join(utilsBaseDestDir, fileName)
		}

		// Ensure the specific util directory exists.
		utilDestDir := filepath.Dir(destPath)
		err := os.MkdirAll(utilDestDir, 0755)
		if err != nil {
			return fmt.Errorf("failed to create destination utils directory '%s': %w", utilDestDir, err)
		}

		// Check if file exists and handle overwrite logic.
		fileExists := false
		if _, err := os.Stat(destPath); err == nil {
			fileExists = true
		}

		shouldWriteFile := true

		if fileExists {
			existingRef, _ := readFileVersion(destPath)
			if existingRef == ref {
				fmt.Printf("  Info: Util file '%s' already up-to-date (ref: %s). Skipping.\n", destPath, ref)
				shouldWriteFile = false
			} else {
				if force {
					fmt.Printf("  Info: Util file '%s' exists (Version: '%s'). Forcing overwrite with ref '%s'.\n", destPath, existingRef, ref)
				} else {
					shouldOverwrite := askForOverwrite(destPath, existingRef, ref)
					if !shouldOverwrite {
						fmt.Printf("  Info: Skipping overwrite for '%s'.\n", destPath)
						shouldWriteFile = false
					}
				}
			}
		}

		if shouldWriteFile {
			fileURL := rawContentBaseURL + ref + "/" + repoUtilPath
			fmt.Printf("   Downloading util %s...\n", fileURL)
			data, err := downloadFile(fileURL)
			if err != nil {
				fileNameForError := filepath.Base(repoUtilPath)
				return fmt.Errorf("failed to download util '%s' from %s: %w", fileNameForError, fileURL, err)
			}

			// Add version comment and replace imports.
			utilNameForComment := filepath.Base(repoUtilPath)
			versionComment := fmt.Sprintf("// templui util %s - version: %s installed by templui %s\n", utilNameForComment, ref, version)
			modifiedData := append([]byte(versionComment), data...)
			if strings.HasSuffix(repoUtilPath, ".go") {
				modifiedData = replaceImports(modifiedData, config, "")
			}

			// Write the file.
			err = os.WriteFile(destPath, modifiedData, 0644)
			if err != nil {
				return fmt.Errorf("failed to write util file '%s': %w", destPath, err)
			}
			if fileExists {
				fmt.Printf("   Overwritten %s\n", destPath)
			} else {
				fmt.Printf("   Installed %s\n", destPath)
			}
		}
	}

	return nil
}

// installComponentJS handles the installation of JavaScript files for a component
// and automatically adds Script() template at the end of .templ files
func installComponentJS(config Config, comp ComponentDef, ref string, force bool) error {
	jsFileName := comp.Name + ".min.js"
	// Load from component directory instead of component_scripts
	jsSourceURL := rawContentBaseURL + ref + "/internal/components/" + comp.Name + "/" + jsFileName
	jsDestPath := filepath.Join(config.JSDir, jsFileName)

	// Ensure JS directory exists
	err := os.MkdirAll(config.JSDir, 0755)
	if err != nil {
		return fmt.Errorf("failed to create JS directory '%s': %w", config.JSDir, err)
	}

	// Check if JS file exists and handle overwrite logic
	fileExists := false
	if _, err := os.Stat(jsDestPath); err == nil {
		fileExists = true
	}

	shouldWriteJS := true
	if fileExists && !force {
		fmt.Printf("   JavaScript file '%s' already exists. Overwrite? (y/N): ", jsDestPath)
		var response string
		fmt.Scanln(&response)
		shouldWriteJS = strings.ToLower(strings.TrimSpace(response)) == "y"
	}

	if shouldWriteJS {
		fmt.Printf("   Downloading JavaScript: %s\n", jsSourceURL)
		jsData, err := downloadFile(jsSourceURL)
		if err != nil {
			return fmt.Errorf("failed to download JS file from %s: %w", jsSourceURL, err)
		}

		err = os.WriteFile(jsDestPath, jsData, 0644)
		if err != nil {
			return fmt.Errorf("failed to write JS file '%s': %w", jsDestPath, err)
		}

		if fileExists {
			fmt.Printf("   Overwritten %s\n", jsDestPath)
		} else {
			fmt.Printf("   Installed %s\n", jsDestPath)
		}
	}

	// Add Script() template to .templ files
	err = addScriptTemplateToFiles(config, comp, jsFileName)
	if err != nil {
		return fmt.Errorf("failed to add Script() template: %w", err)
	}

	return nil
}

// addScriptTemplateToFiles adds Script() template at the end of .templ files
func addScriptTemplateToFiles(config Config, comp ComponentDef, jsFileName string) error {
	repoComponentBasePath := "internal/components/"

	for _, repoFilePath := range comp.Files {
		if !strings.HasSuffix(repoFilePath, ".templ") {
			continue // Only process .templ files
		}

		// Determine the destination path
		var destPath string
		if strings.HasPrefix(repoFilePath, repoComponentBasePath) {
			relativePath := repoFilePath[len(repoComponentBasePath):]
			destPath = filepath.Join(config.ComponentsDir, relativePath)
		} else {
			fileName := filepath.Base(repoFilePath)
			destPath = filepath.Join(config.ComponentsDir, fileName)
		}

		// Check if file exists
		if _, err := os.Stat(destPath); os.IsNotExist(err) {
			continue // Skip if .templ file doesn't exist
		}

		// Read the current file content
		content, err := os.ReadFile(destPath)
		if err != nil {
			return fmt.Errorf("failed to read .templ file '%s': %w", destPath, err)
		}

		contentStr := string(content)

		// Create the web path for the JavaScript file
		// Use jsPublicPath if set, otherwise fallback to "/" + jsDir
		var webPath string
		if config.JSPublicPath != "" {
			// Use configured public path
			webPath = strings.TrimSuffix(config.JSPublicPath, "/") + "/" + jsFileName
		} else {
			// Fallback to jsDir (backward compatible)
			webPath = "/" + filepath.ToSlash(filepath.Join(config.JSDir, jsFileName))
		}

		// Check if Script() template already exists
		if strings.Contains(contentStr, "templ Script()") {
			fmt.Printf("   Script() template already exists in %s\n", destPath)
			continue
		}

		// Create the Script() template with correct templ syntax and nonce support
		scriptTemplate := fmt.Sprintf(`templ Script() {
	<script defer nonce={ templ.GetNonce(ctx) } src="%s"></script>
}`, webPath)

		// Add Script() template at the end
		newContent := strings.TrimSpace(contentStr) + "\n\n" + scriptTemplate + "\n"

		// Write the updated content
		err = os.WriteFile(destPath, []byte(newContent), 0644)
		if err != nil {
			return fmt.Errorf("failed to write updated .templ file '%s': %w", destPath, err)
		}

		fmt.Printf("   Added Script() template to %s\n", destPath)
	}

	return nil
}

// listComponents fetches the manifest and lists available components and utils.
func listComponents(ref string) error {
	fmt.Printf("Fetching component manifest from ref '%s'...\n", ref)
	manifest, err := fetchManifest(ref)
	if err != nil {
		if strings.Contains(err.Error(), "status code 404") {
			return fmt.Errorf("could not fetch manifest: ref '%s' not found or does not contain '%s'", ref, manifestPath)
		}
		return fmt.Errorf("could not fetch manifest: %w", err)
	}

	fmt.Printf("\nAvailable components in ref '%s' (Manifest Version: %s):\n", ref, manifest.Version)
	if len(manifest.Components) == 0 {
		fmt.Println("  No components found in this manifest.")
	} else {
		// Print components.
		for _, comp := range manifest.Components {
			desc := comp.Description
			if len(desc) > 45 {
				desc = desc[:42] + "..."
			}

			jsStatus := ""
			if comp.HasJS {
				jsStatus = " [JS]"
			}

			fmt.Printf("  - %-20s : %s%s\n", comp.Name, desc, jsStatus)
		}
	}

	// Print utils.
	if len(manifest.Utils) > 0 {
		fmt.Printf("\nAvailable utils in ref '%s':\n", ref)
		for _, util := range manifest.Utils {
			utilName := filepath.Base(util.Path)
			if util.Description != "" {
				desc := util.Description
				if len(desc) > 50 {
					desc = desc[:47] + "..."
				}
				fmt.Printf("  - %-20s : %s\n", utilName, desc)
			} else {
				fmt.Printf("  - %s\n", utilName)
			}
		}
	}

	return nil
}

// updateCLI attempts to install a new version of the templUI cli based on the passed in ref.
func updateCLI(ref string) error {
	if ref == "" {
		ref = "latest"
	}
	cmd := exec.Command("go", "install", fmt.Sprintf("github.com/templui/templui/cmd/templui@%s", ref))
	output, err := cmd.Output()
	if err != nil {
		return err
	}

	fmt.Print(string(output))
	fmt.Printf("Updated templUI to ref '%s'\n", ref)
	return nil
}

// readFileVersion reads the version ref from the comment in the first line of a file.
func readFileVersion(filePath string) (string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return "", nil // File not existing is not an error here.
		}
		return "", fmt.Errorf("failed to open file %s: %w", filePath, err)
	}
	defer file.Close()

	// Read only the first line.
	scanner := bufio.NewScanner(file)
	if scanner.Scan() {
		line := scanner.Text()
		matches := versionRegex.FindStringSubmatch(line)
		if len(matches) > 1 {
			return matches[1], nil // Return the captured ref.
		}
	}

	if err := scanner.Err(); err != nil {
		return "", fmt.Errorf("error scanning file %s: %w", filePath, err)
	}

	return "", nil // No version comment found.
}

// askForOverwrite prompts the user to confirm overwriting an existing file.
func askForOverwrite(filePath, oldRef, newRef string) bool {
	reader := bufio.NewReader(os.Stdin)

	oldVersionStr := oldRef
	if oldVersionStr == "" {
		oldVersionStr = "<unknown or no comment>"
	}

	fmt.Printf("  Confirm: File '%s' (Existing Version: %s) differs from requested ref '%s'. Overwrite? [y/N]: ",
		filePath, oldVersionStr, newRef)

	input, err := reader.ReadString('\n')
	if err != nil {
		fmt.Printf("\nError reading input: %v. Assuming No.\n", err)
		return false
	}

	input = strings.ToLower(strings.TrimSpace(input))
	return input == "y"
}

// replaceImports replaces internal templUI import paths with the user's configured module name and paths.
func replaceImports(data []byte, config Config, context string) []byte {
	content := string(data)
	// Pattern to find "github.com/templui/templui/internal/..." imports.
	// It captures the part after "internal/", e.g., "components/icon" or "utils".
	internalImportPattern := `"github.com/templui/templui/internal/([^"]+)"`
	re := regexp.MustCompile(internalImportPattern)

	modified := false // Flag to track if any replacement occurred

	newContent := re.ReplaceAllStringFunc(content, func(originalFullImport string) string {
		// originalFullImport is like: "github.com/templui/templui/internal/components/icon" (with quotes)
		// submatches[0] is originalFullImport
		// submatches[1] is the captured group, e.g., "components/icon" or "utils"
		submatches := re.FindStringSubmatch(originalFullImport)
		if len(submatches) < 2 {
			return originalFullImport // Should not happen if regex matches
		}
		repoRelativePath := submatches[1] // This is "components/icon" or "utils"

		var newImportPath string
		if strings.HasPrefix(repoRelativePath, "components/") {
			// For "components/icon", new path is "config.ModuleName/config.ComponentsDir/icon"
			componentName := strings.TrimPrefix(repoRelativePath, "components/")
			newImportPath = fmt.Sprintf("%s/%s/%s", config.ModuleName, config.ComponentsDir, componentName)
			modified = true
		} else if repoRelativePath == "utils" || strings.HasPrefix(repoRelativePath, "utils/") {
			// For "utils", new path is "config.ModuleName/config.UtilsDir"
			// For "utils/sub", new path is "config.ModuleName/config.UtilsDir/sub"
			utilSubPath := strings.TrimPrefix(repoRelativePath, "utils") // "" or "/sub"
			utilSubPath = strings.TrimPrefix(utilSubPath, "/")           // "sub" or ""

			if utilSubPath == "" {
				newImportPath = fmt.Sprintf("%s/%s", config.ModuleName, config.UtilsDir)
			} else {
				newImportPath = fmt.Sprintf("%s/%s/%s", config.ModuleName, config.UtilsDir, utilSubPath)
			}
			modified = true
		} else {
			// Path doesn't match known structures, return original.
			return originalFullImport
		}
		return fmt.Sprintf(`"%s"`, newImportPath)
	})

	if modified { // Use the flag to log
		logPrefix := "    ->"
		if context != "" {
			logPrefix = fmt.Sprintf("    -> [%s]", context)
		}
		fmt.Printf("%s Adjusted import paths according to .templui.json config.\n", logPrefix)
	}

	return []byte(newContent)
}
