let d3ready = false;

looker.plugins.visualizations.add({
  id: 'variable_width_bar_chart_refined',
  label: 'Variable Width Bar Chart (Refined)',

  // (options aqui continuam os mesmos...)

  create(element, config) {
    if (typeof d3 === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://d3js.org/d3.v7.min.js';
      script.onload = () => { d3ready = true; this.trigger('update'); };
      document.head.appendChild(script);
    } else {
      d3ready = true;
    }

    element.innerHTML = `
      <style>
        .chart-container { width: 100%; height: 100%; position: relative; }
        svg { width: 100%; height: 100%; }
        .tooltip { position: absolute; background: white; border: 1px solid #CCC; padding: 8px; font-size: 12px; pointer-events: none; display: none; z-index: 10; }
        .axis line, .axis path { stroke: #CCC; }
      </style>
      <div class="chart-container">
        <svg></svg>
        <div class="tooltip"></div>
      </div>
    `;
  },

  updateAsync(data, element, config, queryResponse, details, doneRendering) {
    if (!d3ready) {
      setTimeout(() => this.updateAsync(data, element, config, queryResponse, details, doneRendering), 100);
      return;
    }

    // ... resto do código permanece igual (construção do gráfico com D3) ...
  }
});
