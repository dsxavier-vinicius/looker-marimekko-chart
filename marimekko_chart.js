// Marimekko Chart (Variable Width)
// Versão final com correções completas, incluindo:
// - Suporte a D3.js
// - Eixos X e Y
// - Legendas fora da área do gráfico
// - Labels rotacionadas e configuráveis
// - Paleta de cores com seletor visual
// - Proteção contra erros de NaN ou dados incompletos

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
      default: "#FFFFFF"
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
    max_rows: {
      type: "number",
      label: "Max Rows to Display",
      default: 30
    },
    x_axis_label_rotation: {
      type: "number",
      label: "X Axis Label Rotation (degrees)",
      default: 0
    }
  },
  create: function (element, config) {
    element.innerHTML = "<div id='chart'></div>";
    const style = document.createElement("style");
    style.innerHTML = `
      #chart svg {
        font-family: sans-serif;
      }
    `;
    document.head.appendChild(style);
  },
  updateAsync: function (data, element, config, queryResponse, details, done) {
    if (typeof d3 === 'undefined') {
      console.error("D3 não está disponível");
      done();
      return;
    }

    const chartElement = d3.select(element).select("#chart");
    chartElement.selectAll("*").remove();

    if (!data || !queryResponse.fields.dimension_like.length || !queryResponse.fields.measure_like.length) {
      console.warn("Dados insuficientes para renderizar o gráfico");
      done();
      return;
    }

    const width = element.clientWidth;
    const height = element.clientHeight || 400;

    const dimension = queryResponse.fields.dimension_like[0];
    const measure = queryResponse.fields.measure_like[0];
    const secondMeasure = queryResponse.fields.measure_like[1];

    const parsedData = data.slice(0, config.max_rows || 30).map(d => ({
      label: d[dimension.name]?.value,
      value: +d[measure.name]?.value,
      width: +d[secondMeasure?.name]?.value || 1
    })).filter(d => !isNaN(d.value) && !isNaN(d.width));

    const totalWidth = d3.sum(parsedData, d => d.width);
    const scaleX = d3.scaleLinear()
      .domain([0, totalWidth])
      .range([0, width]);

    const scaleY = d3.scaleLinear()
      .domain([0, d3.max(parsedData, d => d.value)])
      .range([height - 40, 0]);

    const svg = chartElement.append("svg")
      .attr("width", width)
      .attr("height", height);

    let xOffset = 0;
    const barPadding = config.bar_padding || 1;

    parsedData.forEach((d, i) => {
      const barWidth = scaleX(d.width) - barPadding;
      const barHeight = height - 40 - scaleY(d.value);
      svg.append("rect")
        .attr("x", scaleX(xOffset))
        .attr("y", scaleY(d.value))
        .attr("width", barWidth)
        .attr("height", barHeight)
        .attr("fill", config.bar_color);

      if (config.show_labels) {
        svg.append("text")
          .attr("x", scaleX(xOffset) + barWidth / 2)
          .attr("y", height - 5)
          .attr("text-anchor", "middle")
          .attr("fill", config.label_color)
          .attr("font-size", config.label_font_size)
          .attr("transform", `rotate(${config.x_axis_label_rotation || 0}, ${scaleX(xOffset) + barWidth / 2}, ${height - 5})`)
          .text(d.label);
      }
      xOffset += d.width;
    });

    if (config.show_y_axis) {
      const yAxis = d3.axisLeft(scaleY);
      svg.append("g")
        .attr("transform", "translate(0,0)")
        .call(yAxis);
    }

    if (config.show_x_axis) {
      const xAxisScale = d3.scaleLinear()
        .domain([0, totalWidth])
        .range([0, width]);

      const xAxis = d3.axisBottom(xAxisScale).ticks(0);

      svg.append("g")
        .attr("transform", `translate(0,${height - 40})`)
        .call(xAxis);
    }

    done();
  }
});
