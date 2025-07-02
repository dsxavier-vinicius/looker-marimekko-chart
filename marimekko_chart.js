// Marimekko Chart for Looker with full configuration support

looker.plugins.visualizations.add({
  id: "marimekko_chart_variable_width",
  label: "Marimekko Chart (Variable Width)",
  options: {
    bar_color: {
      type: "color",
      label: "Bar Color",
      default: "#4477aa"
    },
    bar_padding: {
      type: "number",
      label: "Bar Padding (px)",
      default: 2
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
    x_label_rotation: {
      type: "number",
      label: "X Axis Label Rotation (degrees)",
      default: 0
    },
    max_rows: {
      type: "number",
      label: "Max Rows to Display",
      default: 100
    }
  },

  create: function(element, config) {
    element.innerHTML = "<div id='marimekko'></div>";
  },

  updateAsync: function(data, element, config, queryResponse, details, done) {
    if (!window.d3) {
      const d3Script = document.createElement("script");
      d3Script.src = "https://d3js.org/d3.v7.min.js";
      d3Script.onload = () => this.updateAsync(data, element, config, queryResponse, details, done);
      document.head.appendChild(d3Script);
      return;
    }

    const d3 = window.d3;
    const container = d3.select(element).select("#marimekko");
    container.selectAll("*").remove();

    const width = element.clientWidth;
    const height = element.clientHeight || 400;
    const margin = {top: 40, right: 30, bottom: 80, left: 50};
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = container.append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const categoryDim = queryResponse.fields.dimensions[0].name;
    const heightMeasure = queryResponse.fields.measures[0].name;
    const widthMeasure = queryResponse.fields.measures[1].name;

    const formatted = data.slice(0, config.max_rows || 100).map(d => ({
      category: d[categoryDim].value,
      heightVal: +d[heightMeasure].value,
      widthVal: +d[widthMeasure].value
    })).filter(d => !isNaN(d.heightVal) && !isNaN(d.widthVal));

    const totalWidthVal = d3.sum(formatted, d => d.widthVal);
    let xOffset = 0;

    const xScale = d3.scaleLinear()
      .domain([0, totalWidthVal])
      .range([0, innerWidth]);

    const yMax = d3.max(formatted, d => d.heightVal);
    const yScale = d3.scaleLinear()
      .domain([0, yMax])
      .range([innerHeight, 0]);

    // Draw bars
    svg.selectAll("rect")
      .data(formatted)
      .enter()
      .append("rect")
      .attr("x", d => {
        const offset = xOffset;
        xOffset += d.widthVal;
        return xScale(offset - d.widthVal);
      })
      .attr("y", d => yScale(d.heightVal))
      .attr("width", d => xScale(d.widthVal) - config.bar_padding)
      .attr("height", d => innerHeight - yScale(d.heightVal))
      .attr("fill", config.bar_color);

    // Labels
    if (config.show_labels) {
      xOffset = 0;
      svg.selectAll("text.label")
        .data(formatted)
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("x", d => {
          const offset = xOffset;
          xOffset += d.widthVal;
          return xScale(offset - d.widthVal / 2);
        })
        .attr("y", d => yScale(d.heightVal) - 5)
        .attr("text-anchor", "middle")
        .attr("fill", config.label_color)
        .style("font-size", `${config.label_font_size}px`)
        .text(d => d.category);
    }

    // X Axis
    if (config.show_x_axis) {
      const axis = d3.axisBottom(xScale)
        .tickValues([]);

      const xAxis = svg.append("g")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(axis);

      // Custom category labels
      xOffset = 0;
      svg.selectAll("text.xtick")
        .data(formatted)
        .enter()
        .append("text")
        .attr("x", d => {
          const offset = xOffset;
          xOffset += d.widthVal;
          return xScale(offset - d.widthVal / 2);
        })
        .attr("y", innerHeight + 20)
        .attr("text-anchor", "middle")
        .attr("transform", d => {
          const offset = xOffset;
          const x = xScale(offset - d.widthVal / 2);
          return `rotate(${config.x_label_rotation}, ${x}, ${innerHeight + 20})`;
        })
        .style("font-size", `${config.label_font_size}px`)
        .text(d => d.category);
    }

    // Y Axis
    if (config.show_y_axis) {
      svg.append("g")
        .call(d3.axisLeft(yScale));
    }

    done();
  }
});
