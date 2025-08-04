visualization: {
  id: "variable_width_column"
  label: "Variable Width Column"
  file: "variable_width_column.js"
  dependencies: [
    {
      url: "https://d3js.org/d3.v5.min.js"
      integrity: "sha256-gpgaJgC2frL1yqPzO2eHssUjQuc5EwX2IuUjf2KxKmw="
      crossorigin: "anonymous"
    }
  ]
}

visualization_option: {
  name: "color_scheme"
  section: "Style"
  type: "string"
  label: "Bar Color"
  display: "color"
  default: "#2756B3"
}

visualization_option: {
  name: "show_tooltip"
  section: "Style"
  type: "boolean"
  label: "Show Tooltip"
  default: "true"
}

visualization_option: {
  name: "y_axis_name"
  section: "Y-Axis"
  type: "string"
  label: "Y-Axis Name"
  placeholder: "Enter Y-Axis Name"
}

visualization_option: {
  name: "label_font_size"
  section: "X-Axis"
  type: "number"
  label: "Label Font Size"
  default: "12"
}
