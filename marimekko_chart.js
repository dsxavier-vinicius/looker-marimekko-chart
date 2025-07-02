// Looker Custom Visualization: Variable Width Chart
// Author: Custom implementation for 1 dimension and 2 measures
// Measure 1: Defines bar width | Measure 2: Defines bar height

looker.plugins.visualizations.add({
  id: "variable_width_chart",
  label: "Variable Width Chart",
  options: {
    barColor: {
      label: "Bar Color",
      type: "string",
      display: "color",
      default: "#4682b4"
    },
    barPadding: {
      label: "Bar Padding (px)",
      type: "number",
      default: 2
    },
    labelColor: {
      label: "Label Color",
      type: "string",
      display: "color",
      default: "#000000"
    },
    labelFontSize: {
      label: "Label Font Size",
      type: "number",
      default: 12
    },
    maxRows: {
      label: "Max Rows to Display",
      type: "number",
      default: 30
    },
    showLabels: {
      label: "Show Labels",
      type: "boolean",
      default: true
    },
    showXAxis: {
      label: "Show X Axis",
      type: "boolean",
      default: true
    },
    showYAxis: {
      label: "Show Y Axis",
      type: "boolean",
      default: true
    },
    xAxisLabelRotation: {
      label: "X Axis Label Rotation (degrees)",
      type: "number",
      default: 0
    }
  },
  create: function (element, config) {
    element.innerHTML = "";
    const container = element.appendChild(document.createElement("div"));
    container.id = "vis-container";
    container.style.width = "100%";
    container.style.height = "100%";
  },

  updateAsync: function (data, element, config, queryResponse, details, done) {
    if (!data || data.length === 0) {
      element.innerHTML = "No data";
      done();
      return;
    }

    // Load D3 if not available
    if (typeof d3 === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://d3js.org/d3.v7.min.js';
      script.onload = () => this.updateAsync(data, element, config, queryResponse, details, done);
      document.head.appendChild(script);
      return;
    }

    // Clear existing
    d3.select("#vis-container").html("");

    // Extract columns
    const dimension = queryResponse.fields.dimension_like[0];
    const widthMeasure = queryResponse.fields.measure_like[0];
    const heightMeasure = queryResponse.fields.measure_like[1];

    const rows = data.slice(0, config.maxRows || 30);

    const values = rows.map(d => {
      return {
        category: d[dimension.name].value,
        width: +d[widthMeasure.name].value,
        height: +d[heightMeasure.name].value
      };
    });

    const width = element.clientWidth;
    const height = element.clientHeight;
    const padding = config.barPadding || 2;

    const svg = d3.select("#vis-container")
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    const totalWidth = d3.sum(values, d => d.width);
    const xScale = d3.scaleLinear()
      .domain([0, totalWidth])
      .range([50, width - 50]);

    const yMax = d3.max(values, d => d.height);
    const yScale = d3.scaleLinear()
      .domain([0, yMax])
      .range([height - 50, 20]);

    let currentX = 0;

    svg.selectAll("rect")
      .data(values)
      .enter()
      .append("rect")
      .attr("x", d => {
        const x = xScale(currentX);
        currentX += d.width;
        return x;
      })
      .attr("y", d => yScale(d.height))
      .attr("width", d => xScale(d.width + padding) - xScale(0) - padding)
      .attr("height", d => height - 50 - yScale(d.height))
      .attr("fill", config.barColor);

    // Reset X for labels
    currentX = 0;

    if (config.showLabels) {
      svg.selectAll("text")
        .data(values)
        .enter()
        .append("text")
        .text(d => d.category)
        .attr("x", d => {
          const labelX = xScale(currentX + d.width / 2);
          currentX += d.width;
          return labelX;
        })
        .attr("y", height - 10)
        .attr("fill", config.labelColor)
        .attr("font-size", config.labelFontSize)
        .attr("text-anchor", "middle")
        .attr("transform", d => `rotate(${config.xAxisLabelRotation || 0}, ${xScale(currentX - d.width / 2)}, ${height - 10})`);
    }

    if (config.showYAxis) {
      const yAxis = d3.axisLeft(yScale);
      svg.append("g")
        .attr("transform", "translate(50,0)")
        .call(yAxis);
    }

    if (config.showXAxis) {
      const xAxis = d3.axisBottom(xScale)
        .ticks(5)
        .tickFormat(""); // No tick values for continuous bar width scale
      svg.append("g")
        .attr("transform", `translate(0, ${height - 50})`)
        .call(xAxis);
    }

    done();
  }
});
