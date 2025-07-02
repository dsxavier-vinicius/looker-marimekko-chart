// Ensure D3 is loaded
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

looker.plugins.visualizations.add({
  id: "marimekko_chart",
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
    show_x_axis: {
      type: "boolean",
      label: "Show X Axis",
      default: true
    },
    show_y_axis: {
      type: "boolean",
      label: "Show Y Axis",
      default: true
    },
    label_rotation: {
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

  create: function(element, config){
    element.innerHTML = "<svg></svg>";
    this.svg = d3.select(element).select("svg");
  },

  updateAsync: function(data, element, config, queryResponse, details, doneRendering){
    this.clearErrors();

    if (!data || data.length === 0) {
      this.addError({title: "No Data", message: "The query returned no data."});
      return doneRendering();
    }

    const catDim = queryResponse.fields.dimension_like[0];
    const valMes = queryResponse.fields.measure_like[0];
    const widthMes = queryResponse.fields.measure_like[1] || valMes;

    const processed = data.slice(0, config.max_rows || 50).map(d => {
      return {
        category: d[catDim.name].value,
        height: +d[valMes.name].value,
        width: +d[widthMes.name].value
      };
    }).filter(d => !isNaN(d.height) && !isNaN(d.width) && d.width > 0);

    const width = element.clientWidth;
    const height = element.clientHeight || 400;
    const padding = +config.bar_padding;
    const color = config.bar_color;

    const totalWidthValue = d3.sum(processed, d => d.width);
    const totalChartWidth = width - padding * (processed.length - 1);

    const scaleY = d3.scaleLinear()
      .domain([0, d3.max(processed, d => d.height)])
      .range([height - 50, 0]);

    const scaleX = d3.scaleLinear()
      .domain([0, totalWidthValue])
      .range([0, totalChartWidth]);

    this.svg.attr("width", width).attr("height", height);
    this.svg.selectAll("*").remove();

    let currentX = 0;

    const g = this.svg.append("g").attr("transform", "translate(40,10)");

    processed.forEach((d, i) => {
      const barWidth = scaleX(d.width);
      const x = currentX;
      const y = scaleY(d.height);
      const h = height - 50 - y;

      g.append("rect")
        .attr("x", x)
        .attr("y", y)
        .attr("width", barWidth)
        .attr("height", h)
        .attr("fill", color);

      if (config.show_labels) {
        g.append("text")
          .attr("x", x + barWidth / 2)
          .attr("y", height - 30)
          .attr("fill", config.label_color)
          .attr("font-size", config.label_font_size)
          .attr("text-anchor", "middle")
          .attr("transform", `rotate(${config.label_rotation},${x + barWidth / 2},${height - 30})`)
          .text(d.category);
      }

      currentX += barWidth + padding;
    });

    if (config.show_y_axis) {
      const yAxis = d3.axisLeft(scaleY).ticks(5);
      this.svg.append("g")
        .attr("transform", "translate(40,10)")
        .call(yAxis);
    }

    if (config.show_x_axis) {
      this.svg.append("line")
        .attr("x1", 40)
        .attr("y1", height - 40)
        .attr("x2", width)
        .attr("y2", height - 40)
        .attr("stroke", "black");
    }

    doneRendering();
  }
});
