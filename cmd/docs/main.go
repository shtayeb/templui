package main

import (
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/a-h/templ"

	"github.com/templui/templui/assets"
	"github.com/templui/templui/internal/components/toast"
	"github.com/templui/templui/internal/config"
	"github.com/templui/templui/internal/middleware"
	"github.com/templui/templui/internal/ui/pages"
	"github.com/templui/templui/internal/ui/showcase"
	"github.com/templui/templui/static"

	datastar "github.com/starfederation/datastar/sdk/go"
)

func toastDemoHandler(w http.ResponseWriter, r *http.Request) {
	duration, err := strconv.Atoi(r.FormValue("duration"))
	if err != nil {
		duration = 0
	}

	toastProps := toast.Props{
		Title:         r.FormValue("title"),
		Description:   r.FormValue("description"),
		Variant:       toast.Variant(r.FormValue("type")),
		Position:      toast.Position(r.FormValue("position")),
		Duration:      duration,
		Dismissible:   r.FormValue("dismissible") == "true",
		ShowIndicator: r.FormValue("indicator") == "true",
		Icon:          r.FormValue("icon") == "true",
	}

	toast.Toast(toastProps).Render(r.Context(), w)
}

func handleLoadDatastarExample(w http.ResponseWriter, r *http.Request) {
	sse := datastar.NewSSE(w, r)

	sse.MergeFragmentTempl(
		showcase.ModalDefault(),
		datastar.WithUseViewTransitions(true),
	)
}

func handleLoadModalHtmx(w http.ResponseWriter, r *http.Request) {
	showcase.AvatarFallback().Render(r.Context(), w)
	showcase.CalendarDefault().Render(r.Context(), w)
	showcase.CarouselDefault().Render(r.Context(), w)
	showcase.ChartDefault().Render(r.Context(), w)
	showcase.CodeDefault().Render(r.Context(), w)
	showcase.DatePickerDefault().Render(r.Context(), w)
	showcase.DrawerDefault().Render(r.Context(), w)
	showcase.DropdownDefault().Render(r.Context(), w)
	showcase.InputPassword().Render(r.Context(), w)
	showcase.InputOTPDefault().Render(r.Context(), w)
	showcase.ModalDefault().Render(r.Context(), w)
	showcase.PopoverDefault().Render(r.Context(), w)
	showcase.ProgressDefault().Render(r.Context(), w)
	showcase.RatingDefault().Render(r.Context(), w)
	showcase.SelectBoxDefault().Render(r.Context(), w)
	showcase.SliderValue().Render(r.Context(), w)
	showcase.TabsDefault().Render(r.Context(), w)
	showcase.TagsInputDefault().Render(r.Context(), w)
	showcase.TextareaAutoResize().Render(r.Context(), w)
	showcase.TimePickerDefault().Render(r.Context(), w)
	showcase.ToastDefault().Render(r.Context(), w)
}

// htmxHandler wraps a templ component to support HTMX fragment requests
func htmxHandler(component templ.Component) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if middleware.IsHtmxRequest(r) {
			// For HTMX requests, render content, toc, and title fragments
			// The toc and title fragments have hx-swap-oob attribute for out-of-band swap
			templ.Handler(component, templ.WithFragments("content", "toc", "title")).ServeHTTP(w, r)
		} else {
			// For regular requests, render the full page
			templ.Handler(component).ServeHTTP(w, r)
		}
	})
}

func main() {
	mux := http.NewServeMux()
	config.LoadConfig()
	SetupAssetsRoutes(mux)

	wrappedMux := middleware.WithURLPathValue(
		middleware.CacheControlMiddleware(
			middleware.GitHubStarsMiddleware(
				mux,
			),
		),
	)

	mux.HandleFunc("GET /sitemap.xml", func(w http.ResponseWriter, r *http.Request) {
		content, err := static.Files.ReadFile("sitemap.xml")
		if err != nil {
			http.Error(w, "Sitemap not found", http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/xml")
		w.Write(content)
	})

	mux.HandleFunc("GET /robots.txt", func(w http.ResponseWriter, r *http.Request) {
		content, err := static.Files.ReadFile("robots.txt")
		if err != nil {
			http.Error(w, "Robots.txt not found", http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "text/plain")
		w.Write(content)
	})

	mux.Handle("GET /{$}", templ.Handler(pages.Landing()))
	mux.Handle("GET /docs", http.RedirectHandler("/docs/introduction", http.StatusSeeOther))
	mux.Handle("GET /docs/getting-started", http.RedirectHandler("/docs/introduction", http.StatusSeeOther))
	mux.Handle("GET /docs/components", htmxHandler(pages.ComponentsOverview()))
	mux.Handle("GET /docs/introduction", htmxHandler(pages.Introduction()))
	mux.Handle("GET /docs/how-to-use", htmxHandler(pages.HowToUse()))
	mux.Handle("GET /docs/themes", htmxHandler(pages.Themes()))
	// Components
	mux.Handle("GET /docs/components/accordion", htmxHandler(pages.Accordion()))
	mux.Handle("GET /docs/components/alert", htmxHandler(pages.Alert()))
	mux.Handle("GET /docs/components/aspect-ratio", htmxHandler(pages.AspectRatio()))
	mux.Handle("GET /docs/components/avatar", htmxHandler(pages.Avatar()))
	mux.Handle("GET /docs/components/badge", htmxHandler(pages.Badge()))
	mux.Handle("GET /docs/components/breadcrumb", htmxHandler(pages.Breadcrumb()))
	mux.Handle("GET /docs/components/button", htmxHandler(pages.Button()))
	mux.Handle("GET /docs/components/calendar", htmxHandler(pages.Calendar()))
	mux.Handle("GET /docs/components/card", htmxHandler(pages.Card()))
	mux.Handle("GET /docs/components/carousel", htmxHandler(pages.Carousel()))
	mux.Handle("GET /docs/components/charts", htmxHandler(pages.Chart()))
	mux.Handle("GET /docs/components/checkbox", htmxHandler(pages.Checkbox()))
	mux.Handle("GET /docs/components/checkbox-card", htmxHandler(pages.CheckboxCard()))
	mux.Handle("GET /docs/components/code", htmxHandler(pages.Code()))
	mux.Handle("GET /docs/components/date-picker", htmxHandler(pages.DatePicker()))
	mux.Handle("GET /docs/components/drawer", htmxHandler(pages.Drawer()))
	mux.Handle("GET /docs/components/dropdown", htmxHandler(pages.Dropdown()))
	mux.Handle("GET /docs/components/form", htmxHandler(pages.Form()))
	mux.Handle("GET /docs/components/icon", htmxHandler(pages.Icon()))
	mux.Handle("GET /docs/components/input", htmxHandler(pages.Input()))
	mux.Handle("GET /docs/components/input-otp", htmxHandler(pages.InputOtp()))
	mux.Handle("GET /docs/components/label", htmxHandler(pages.Label()))
	mux.Handle("GET /docs/components/modal", htmxHandler(pages.Modal()))
	mux.Handle("GET /docs/components/pagination", htmxHandler(pages.Pagination()))
	mux.Handle("GET /docs/components/progress", htmxHandler(pages.Progress()))
	mux.Handle("GET /docs/components/radio", htmxHandler(pages.Radio()))
	mux.Handle("GET /docs/components/radio-card", htmxHandler(pages.RadioCard()))
	mux.Handle("GET /docs/components/rating", htmxHandler(pages.Rating()))
	mux.Handle("GET /docs/components/select-box", htmxHandler(pages.SelectBox()))
	mux.Handle("GET /docs/components/separator", htmxHandler(pages.Separator()))
	mux.Handle("GET /docs/components/skeleton", htmxHandler(pages.Skeleton()))
	mux.Handle("GET /docs/components/slider", htmxHandler(pages.Slider()))
	mux.Handle("GET /docs/components/table", htmxHandler(pages.Table()))
	mux.Handle("GET /docs/components/tabs", htmxHandler(pages.Tabs()))
	mux.Handle("GET /docs/components/tags-input", htmxHandler(pages.TagsInput()))
	mux.Handle("GET /docs/components/textarea", htmxHandler(pages.Textarea()))
	mux.Handle("GET /docs/components/time-picker", htmxHandler(pages.TimePicker()))
	mux.Handle("GET /docs/components/toast", htmxHandler(pages.Toast()))
	mux.Handle("GET /docs/components/toggle", htmxHandler(pages.Toggle()))
	mux.Handle("GET /docs/components/tooltip", htmxHandler(pages.Tooltip()))
	mux.Handle("GET /docs/components/popover", htmxHandler(pages.Popover()))
	// Showcase API
	mux.Handle("POST /docs/toast/demo", http.HandlerFunc(toastDemoHandler))

	// Datastar Example
	mux.Handle("GET /docs/datastar-example", htmxHandler(pages.ExampleDatastar()))
	mux.Handle("GET /api/load-datepicker", http.HandlerFunc(handleLoadDatastarExample))

	// HTMX Example
	mux.Handle("GET /docs/htmx-example", htmxHandler(pages.ExampleHtmx()))
	mux.Handle("GET /api/load-modal-htmx", http.HandlerFunc(handleLoadModalHtmx))

	// 404 handler - using Go 1.22+ wildcard syntax
	// The {$} ensures this only matches exactly "/" and not as a prefix
	// All unmatched routes will fall through to this catch-all
	mux.HandleFunc("/{path...}", notFoundHandler)

	log.Println("Server is running on http://localhost:8090")
	http.ListenAndServe(":8090", wrappedMux)
}

func notFoundHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotFound)
	pages.NotFound().Render(r.Context(), w)
}

func SetupAssetsRoutes(mux *http.ServeMux) {
	var isDevelopment = config.AppConfig.GoEnv != "production"

	assetHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if isDevelopment {
			w.Header().Set("Cache-Control", "no-store")
		}

		var fs http.Handler
		if isDevelopment {
			fs = http.FileServer(http.Dir("./assets"))
		} else {
			fs = http.FileServer(http.FS(assets.Assets))
		}

		fs.ServeHTTP(w, r)
	})

	mux.Handle("GET /assets/", http.StripPrefix("/assets/", assetHandler))

	// Safari Favicon Compatibility
	// Safari often ignores HTML favicon tags and looks for files in the root directory.
	// We serve specific favicon files from /assets/img/favicon/ at root URLs for better Safari compatibility.
	faviconRoutes := map[string]string{
		"/favicon.ico":          "img/favicon/favicon.ico",
		"/apple-touch-icon.png": "img/favicon/apple-touch-icon.png",
		"/favicon-32x32.png":    "img/favicon/favicon-32x32.png",
		"/favicon-16x16.png":    "img/favicon/favicon-16x16.png",
	}

	for route, assetPath := range faviconRoutes {
		// Capture variables for closure
		r := route
		path := assetPath

		mux.HandleFunc("GET "+r, func(w http.ResponseWriter, r *http.Request) {
			// Set content type based on file extension
			if strings.HasSuffix(path, ".ico") {
				w.Header().Set("Content-Type", "image/x-icon")
			} else if strings.HasSuffix(path, ".png") {
				w.Header().Set("Content-Type", "image/png")
			}

			if isDevelopment {
				w.Header().Set("Cache-Control", "no-store")
				http.ServeFile(w, r, "./assets/"+path)
			} else {
				content, err := assets.Assets.ReadFile(path)
				if err != nil {
					http.Error(w, "Favicon not found", http.StatusNotFound)
					return
				}
				w.Write(content)
			}
		})
	}
}
