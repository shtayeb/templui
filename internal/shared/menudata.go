package shared

type SideLink struct {
	Text  string
	Href  string
	Icon  string
	Click string
}

type Section struct {
	Title string
	Links []SideLink
}

var Sections = []Section{
	{
		Title: "Getting Started",
		Links: []SideLink{
			{
				Text: "Introduction",
				Href: "/docs/introduction",
			},
			{
				Text: "How to Use",
				Href: "/docs/how-to-use",
			},
		},
	},
	{
		Title: "Components",
		Links: []SideLink{
			{
				Text: "Accordion",
				Href: "/docs/components/accordion",
			},
			{
				Text: "Alert",
				Href: "/docs/components/alert",
			},
			{
				Text: "Aspect Ratio",
				Href: "/docs/components/aspect-ratio",
			},
			{
				Text: "Avatar",
				Href: "/docs/components/avatar",
			},
			{
				Text: "Badge",
				Href: "/docs/components/badge",
			},
			{
				Text: "Breadcrumb",
				Href: "/docs/components/breadcrumb",
			},
			{
				Text: "Button",
				Href: "/docs/components/button",
			},
			{
				Text: "Calendar",
				Href: "/docs/components/calendar",
			},
			{
				Text: "Card",
				Href: "/docs/components/card",
			},
			{
				Text: "Carousel",
				Href: "/docs/components/carousel",
			},
			{
				Text: "Charts",
				Href: "/docs/components/charts",
			},
			{
				Text: "Checkbox",
				Href: "/docs/components/checkbox",
			},
			{
				Text: "Collapsible",
				Href: "/docs/components/collapsible",
			},
			{
				Text: "Code",
				Href: "/docs/components/code",
			},
			{
				Text: "Date Picker",
				Href: "/docs/components/date-picker",
			},
			{
				Text: "Dropdown",
				Href: "/docs/components/dropdown",
			},
			{
				Text: "Form",
				Href: "/docs/components/form",
			},
			{
				Text: "Icon",
				Href: "/docs/components/icon",
			},
			{
				Text: "Input",
				Href: "/docs/components/input",
			},
			{
				Text: "Input OTP",
				Href: "/docs/components/input-otp",
			},
			{
				Text: "Label",
				Href: "/docs/components/label",
			},
			{
				Text: "Modal",
				Href: "/docs/components/modal",
			},
			{
				Text: "Pagination",
				Href: "/docs/components/pagination",
			},
			{
				Text: "Popover",
				Href: "/docs/components/popover",
			},
			{
				Text: "Progress",
				Href: "/docs/components/progress",
			},
			{
				Text: "Radio",
				Href: "/docs/components/radio",
			},
			{
				Text: "Rating",
				Href: "/docs/components/rating",
			},
			{
				Text: "Select Box",
				Href: "/docs/components/select-box",
			},
			{
				Text: "Separator",
				Href: "/docs/components/separator",
			},
			{
				Text: "Sheet",
				Href: "/docs/components/sheet",
			},
			{
				Text: "Sidebar",
				Href: "/docs/components/sidebar",
			},
			{
				Text: "Skeleton",
				Href: "/docs/components/skeleton",
			},
			{
				Text: "Slider",
				Href: "/docs/components/slider",
			},
			{
				Text: "Switch",
				Href: "/docs/components/switch",
			},
			{
				Text: "Table",
				Href: "/docs/components/table",
			},
			{
				Text: "Tabs",
				Href: "/docs/components/tabs",
			},
			{
				Text: "Tags Input",
				Href: "/docs/components/tags-input",
			},
			{
				Text: "Textarea",
				Href: "/docs/components/textarea",
			},
			{
				Text: "Time Picker",
				Href: "/docs/components/time-picker",
			},
			{
				Text: "Toast",
				Href: "/docs/components/toast",
			},
			{
				Text: "Tooltip",
				Href: "/docs/components/tooltip",
			},
		},
	},
}
