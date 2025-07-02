// Marimekko Chart with full feature set and correct rendering
looker.plugins.visualizations.add({
  id: "marimekko_chart_variable_width",
  label: "Marimekko Chart (Variable Width)",
  options: {
    bar_color: {
      type: "color",
      label: "Bar Color",
      default: "#4682b4"
    },
    bar_padding: {
      type: "number",
      label: "Bar Padding (px)",
      default: 1
    },
    label_color: {
      type: "color",
      label: "Label Color",
      default: "#ffffff"
    },
    label_font_size: {
      type: "number",
      label: "Label Font Size",
      default: 12
    },
    show_labels: {
      type: "boolean",
      label: "Show Labels",
      default: true
    },
    show_y_axis: {
      type: "boolean",
      label: "Show Y Axis",
      default: true
    },
    show_x_axis: {
      type: "boolean",
      label: "Show X Axis",
      default: true
    },
    x_axis_label_rotation: {
      type: "number",
      label: "X Axis Label Rotation (degrees)",
      default: 0
    },
    max_rows: {
      type: "number",
      label: "Max Rows to Display",
      default: 50
    }
  },
  create: function(element, config) {
    element.innerHTML = "";
    this.container = d3.select(element)
      .append("div")
      .attr("id", "marimekko_container")
      .style("width", "100%")
      .style("height", "100%");
  },
  updateAsync: function(data, element, config, queryResponse, details, done) {
    element.innerHTML = "";

    const container = this.container;
    const width = element.clientWidth;
    const height = element.clientHeight;

    const xLabels = data.map(d => d[queryResponse.fields.dimension_like[0].name].value).slice(0, config.max_rows);
    const widths = data.map(d => +d[queryResponse.fields.measure_like[0].name].value).slice(0, config.max_rows);
    const heights = data.map(d => +d[queryResponse.fields.measure_like[1].name].value).slice(0, config.max_rows);

    const totalWidth = d3.sum(widths);
    const scaleX = d3.scaleLinear().domain([0, totalWidth]).range([0, width]);
    const scaleY = d3.scaleLinear().domain([0, d3.max(heights)]).range([height - 60, 20]);

    const svg = d3.select(element)
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    let cumulativeWidth = 0;

    const barGroup = svg.append("g");

    for (let i = 0; i < widths.length; i++) {
      const barWidth = scaleX(widths[i]);
      const barHeight = height - scaleY(heights[i]) - 60;
      const x = scaleX(cumulativeWidth);
      const y = scaleY(heights[i]);

      barGroup.append("rect")
        .attr("x", x + config.bar_padding)
        .attr("y", y)
        .attr("width", Math.max(0, barWidth - 2 * config.bar_padding))
        .attr("height", barHeight)
        .attr("fill", config.bar_color);

      if (config.show_labels) {
        barGroup.append("text")
          .attr("x", x + barWidth / 2)
          .attr("y", y + barHeight / 2)
          .attr("fill", config.label_color)
          .attr("font-size", config.label_font_size)
          .attr("text-anchor", "middle")
          .attr("alignment-baseline", "middle")
          .text(heights[i]);
      }

      cumulativeWidth += widths[i];
    }

    // X Axis
    if (config.show_x_axis) {
      const xAxisScale = d3.scalePoint()
        .domain(xLabels)
        .range([0, width]);

      const xAxis = d3.axisBottom(xAxisScale);

      svg.append("g")
        .attr("transform", `translate(0, ${height - 40})`)
        .call(xAxis)
        .selectAll("text")
        .style("text-anchor", config.x_axis_label_rotation ? "end" : "middle")
        .attr("transform", `rotate(${config.x_axis_label_rotation})`)
        .attr("dy", "1.5em");
    }

    // Y Axis
    if (config.show_y_axis) {
      const yAxis = d3.axisLeft(scaleY);

      svg.append("g")
        .attr("transform", "translate(0,0)")
        .call(yAxis);
    }

    done();
  }
});
