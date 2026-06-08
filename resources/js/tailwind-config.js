window.tailwind = window.tailwind || {};

window.tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "surface-variant": "#dbe6d3",
        "on-tertiary-container": "#79283c",
        "surface-container": "#e7f1df",
        "surface-container-high": "#e1ebd9",
        "on-primary-container": "#005106",
        "on-error-container": "#93000a",
        "secondary-fixed": "#d7e7ce",
        tertiary: "#994155",
        "inverse-on-surface": "#eaf4e1",
        "secondary-fixed-dim": "#bbcbb3",
        "on-secondary": "#ffffff",
        "on-primary": "#ffffff",
        "tertiary-fixed-dim": "#ffb2be",
        "on-primary-fixed-variant": "#005306",
        "primary-container": "#17cf26",
        "surface-container-low": "#ecf7e4",
        primary: "#006e0b",
        "background-off-white": "#f6f8f6",
        outline: "#6c7b66",
        "on-tertiary-fixed-variant": "#7b2a3e",
        "on-surface-variant": "#3d4b38",
        "primary-fixed": "#75ff68",
        "on-secondary-fixed": "#121f0f",
        "error-soft": "#fef2f2",
        "tertiary-fixed": "#ffd9de",
        secondary: "#54624f",
        "on-error": "#ffffff",
        "on-secondary-fixed-variant": "#3d4b38",
        "on-background": "#151e13",
        "inverse-primary": "#3be43b",
        "border-subtle": "#e5e7eb",
        error: "#ba1a1a",
        "on-primary-fixed": "#002201",
        "on-tertiary-fixed": "#400014",
        "surface-container-highest": "#dbe6d3",
        "on-surface": "#151e13",
        "surface-tint": "#006e0b",
        "outline-variant": "#bbcbb3",
        "surface-container-lowest": "#ffffff",
        "surface-white": "#ffffff",
        "surface-dim": "#d3ddcb",
        "tertiary-container": "#ff93a7",
        "on-secondary-container": "#566551",
        background: "#f2fdea",
        surface: "#f2fdea",
        "surface-bright": "#f2fdea",
        "primary-fixed-dim": "#3be43b",
        "inverse-surface": "#2a3327",
        "error-container": "#ffdad6",
        "error-text": "#b91c1c",
        "on-tertiary": "#ffffff",
        "secondary-container": "#d1e2c9"
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px"
      },
      spacing: {
        "container-padding": "1.5rem",
        "inner-card-padding": "2rem",
        "stack-gap": "1rem",
        "section-margin": "2rem"
      },
      fontFamily: {
        "button-text": ["Plus Jakarta Sans"],
        "display-lg-mobile": ["Literata"],
        "display-lg": ["Literata"],
        "body-md": ["Literata"],
        "label-md": ["Plus Jakarta Sans"]
      },
      fontSize: {
        "button-text": ["18px", { lineHeight: "1", fontWeight: "500" }],
        "display-lg-mobile": ["24px", { lineHeight: "1.6", fontWeight: "600" }],
        "display-lg": ["32px", { lineHeight: "1.6", fontWeight: "600" }],
        "body-md": ["18px", { lineHeight: "1.5", fontWeight: "500" }],
        "label-md": ["14px", { lineHeight: "20px", fontWeight: "500" }]
      }
    }
  }
};
