// Chart generation using QuickChart.io (generates static PNG URLs)
// No dependencies needed — just builds URLs to the chart rendering service

export async function generateComplianceChart(months: string[], values: number[]): Promise<string> {
  const config = {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        {
          label: 'Cumplimiento %',
          data: values,
          backgroundColor: values.map(v => v >= 90 ? '#27AE60' : v >= 70 ? '#F39C12' : '#E74C3C'),
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 120,
          ticks: { color: '#7F8C8D' },
          grid: { color: '#EEEEEE' },
        },
        x: {
          ticks: { color: '#7F8C8D' },
          grid: { display: false },
        },
      },
    },
  };

  const encodedConfig = encodeURIComponent(JSON.stringify(config));
  return `https://quickchart.io/chart?c=${encodedConfig}&w=600&h=300`;
}

export async function generateClosuresChart(months: string[], values: number[]): Promise<string> {
  const config = {
    type: 'line',
    data: {
      labels: months,
      datasets: [
        {
          label: 'Cierres',
          data: values,
          borderColor: '#1976D2',
          backgroundColor: 'rgba(25, 118, 210, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointBackgroundColor: '#1976D2',
          pointRadius: 4,
          pointBorderColor: '#FFF',
          pointBorderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: '#7F8C8D' },
          grid: { color: '#EEEEEE' },
        },
        x: {
          ticks: { color: '#7F8C8D' },
          grid: { display: false },
        },
      },
    },
  };

  const encodedConfig = encodeURIComponent(JSON.stringify(config));
  return `https://quickchart.io/chart?c=${encodedConfig}&w=600&h=300`;
}
