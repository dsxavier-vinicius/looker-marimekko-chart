// Marimekko Chart with full configuration support for Looker
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
      bar_color: {
        type: 'string',
        label: 'Bar Color',
        default: '#3f88c5'
      },
      bar_padding: {
        type: 'number',
        label: 'Bar Padding (px)',
        default: 1
      },
      label_color: {
        type: 'string',
        label: 'Label Color',
        default: '#ffffff'
      },
      label_font_size: {
        type: 'number',
        label: 'Label Font Size',
        default: 12
      },
      show_labels: {
        type: 'boolean',
        label: 'Show Labels',
        default: true
      },
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
      rotate_x_labels: {
        type: 'number',
        label: 'Rotate X Labels (Degrees)',
        default: 0
      },
      max_rows: {
        type: 'number',
        label: 'Max Rows to Display',
        default: 100
      }
    },

    create: function (element) {
      element.innerHTML = `<div id="viz-container" style="width:100%; height:100%;"><svg></svg></div>`;
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      const container = element.querySelector("#viz-container");
      const svg = d3.select(container).select("svg");
      const width = element.clientWidth;
      const height = element.clientHeight;
      svg.html("");
      svg.attr("width", width).attr("height", height);

      const dimension = queryResponse.fields.dimension_like[0];
      const measure = queryResponse.fields.measure_like[0];

      let processed = data.slice(0, config.max_rows).map(row => {
        return {
          label: row[dimension.name].value,
          value: +row[measure.name].value,
          widthVal: +row[measure.name].value
        };
      }).filter(d => !isNaN(d.value) && !isNaN(d.widthVal));

      const totalWidthVal = d3.sum(processed, d => d.widthVal);

      let x = d3.scaleLinear().range([0, width]);
      let y = d3.scaleLinear().range([height - 40, 10]);

      x.domain([0, totalWidthVal]);
      y.domain([0, d3.max(processed, d => d.value)]);

      let barX = 0;
      processed.forEach(d => {
        d.barX = barX;
        d.barWidth = x(d.widthVal);
        barX += d.barWidth;
      });

      svg.selectAll("rect")
        .data(processed)
        .enter()
        .append("rect")
        .attr("x", d => d.barX)
        .attr("y", d => y(d.value))
        .attr("width", d => d.barWidth - config.bar_padding)
        .attr("height", d => height - 40 - y(d.value))
        .attr("fill", config.bar_color);

      if (config.show_labels) {
        svg.selectAll("text.value")
          .data(processed)
          .enter()
          .append("text")
          .attr("class", "value")
          .attr("x", d => d.barX + (d.barWidth / 2))
          .attr("y", d => y(d.value) - 5)
          .attr("fill", config.label_color)
          .attr("font-size", config.label_font_size)
          .attr("text-anchor", "middle")
          .text(d => d.value);
      }

      if (config.show_x_axis) {
        svg.selectAll("text.label")
          .data(processed)
          .enter()
          .append("text")
          .attr("class", "label")
          .attr("x", d => d.barX + (d.barWidth / 2))
          .attr("y", height - 10)
          .attr("fill", config.label_color)
          .attr("font-size", config.label_font_size)
          .attr("text-anchor", "middle")
          .attr("transform", d => `rotate(${config.rotate_x_labels},${d.barX + (d.barWidth / 2)},${height - 10})`)
          .text(d => d.label);
      }

      if (config.show_y_axis) {
        const yAxis = d3.axisLeft(y).ticks(5);
        svg.append("g")
          .attr("transform", "translate(0,0)")
          .call(yAxis)
          .selectAll("text")
          .style("fill", config.label_color)
          .style("font-size", `${config.label_font_size}px`);
      }

      done();
    }
  });
}
