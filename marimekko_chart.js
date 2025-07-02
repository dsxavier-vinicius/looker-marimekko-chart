if (typeof d3 === 'undefined') {
  const script = document.createElement('script');
  script.src = 'https://d3js.org/d3.v6.min.js';
  script.onload = () => registerViz();
  document.head.appendChild(script);
} else {
  registerViz();
}

function registerViz() {
  looker.plugins.visualizations.add({
    id: "marimekko_chart",
    label: "Marimekko Chart (Variable Width)",
    options: {
      show_x_axis: {
        type: 'boolean',
        label: 'Show X Axis',
        default: true
      },
      show_y_axis: {
        type: 'boolean',
        label: 'Show Y Axis',
        default: true
      },
      show_values: {
        type: 'boolean',
        label: 'Show Bar Values',
        default: false
      },
      rotate_x_labels: {
        type: 'number',
        label: 'Rotate X Labels (Degrees)',
        default: 0
      },
      max_rows: {
        type: 'number',
        label: 'Max Rows to Display',
        default: 100
      },
      legend_position: {
        type: 'string',
        label: 'Legend Position',
        display: 'select',
        default: 'right',
        values: [
          { 'Right': 'right' },
          { 'Left': 'left' },
          { 'Top': 'top' },
          { 'Bottom': 'bottom' }
        ]
      }
    },

    create: function (element, config) {
      element.innerHTML = `
        <div id="viz-container" style="width:100%; height:100%;">
          <svg></svg>
        </div>
      `;
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      const container = element.querySelector("#viz-container");
      const svg = d3.select(container).select("svg");
      const width = element.clientWidth;
      const height = element.clientHeight;
      svg.html("");
      svg.attr("width", width).attr("height", height);

      const dimension = queryResponse.fields.dimension_like[0];
      const widthField = queryResponse.fields.measure_like[0];
      const heightField = queryResponse.fields.measure_like[1];

      const limitedData = data.slice(0, config.max_rows || 100);

      const processed = limitedData.map(d => ({
        label: d[dimension.name].value,
        widthVal: +d[widthField.name].value,
        heightVal: +d[heightField.name].value
      }));

      const totalWidth = d3.sum(processed, d => d.widthVal);
      let xOffset = 0;

      const chartHeight = height - 50;
      const chartWidth = width - 100;

      const yScale = d3.scaleLinear()
        .domain([0, d3.max(processed, d => d.heightVal)])
        .range([chartHeight, 0]);

      const g = svg.append("g").attr("transform", "translate(60,20)");

      // Bars
      processed.forEach(d => {
        const barWidth = (d.widthVal / totalWidth) * chartWidth;
        g.append("rect")
          .attr("x", xOffset)
          .attr("y", yScale(d.heightVal))
          .attr("width", barWidth)
          .attr("height", chartHeight - yScale(d.heightVal))
          .attr("fill", "#3f88c5");

        if (config.show_values) {
          g.append("text")
            .attr("x", xOffset + barWidth / 2)
            .attr("y", yScale(d.heightVal) - 5)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .text(d.heightVal.toLocaleString());
        }

        d.barX = xOffset + barWidth / 2;
        xOffset += barWidth;
      });

      // X Axis
      if (config.show_x_axis) {
        const xLabels = processed.map(d => d.label);
        const xScale = d3.scalePoint()
          .domain(xLabels)
          .range([0, xOffset]);

        const xAxis = d3.axisBottom(xScale);

        g.append("g")
          .attr("transform", `translate(0,${chartHeight})`)
          .call(xAxis)
          .selectAll("text")
          .attr("transform", `rotate(${config.rotate_x_labels || 0})`)
          .style("text-anchor", config.rotate_x_labels ? "end" : "middle");
      }

      // Y Axis
      if (config.show_y_axis) {
        const yAxis = d3.axisLeft(yScale);
        g.append("g")
          .call(yAxis);
      }

      done();
    }
  });
}
