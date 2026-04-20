'use client'

import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

type Props = {
  labels: string[]
  myVolumes: number[]
  friendVolumes: number[]
}

export function ComparisonChart({ labels, myVolumes, friendVolumes }: Props) {
  const data = {
    labels,
    datasets: [
      {
        label: 'Tu poder (kg)',
        data: myVolumes,
        backgroundColor: 'rgba(92, 225, 255, 0.75)',
        hoverBackgroundColor: 'rgba(92, 225, 255, 1)',
        borderColor: 'rgba(92, 225, 255, 1)',
        borderWidth: 1,
        borderRadius: 2,
        borderSkipped: false as const,
      },
      {
        label: 'Aliado (kg)',
        data: friendVolumes,
        backgroundColor: 'rgba(168, 123, 255, 0.7)',
        hoverBackgroundColor: 'rgba(168, 123, 255, 1)',
        borderColor: 'rgba(168, 123, 255, 1)',
        borderWidth: 1,
        borderRadius: 2,
        borderSkipped: false as const,
      },
    ],
  }

  const font = {
    family: 'Orbitron, Rajdhani, sans-serif',
    size: 11,
    weight: 600 as const,
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#9fb3d6',
          font,
          boxWidth: 14,
          boxHeight: 8,
          padding: 18,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(3, 5, 13, 0.95)',
        titleColor: '#5ce1ff',
        bodyColor: '#e6f3ff',
        borderColor: 'rgba(92, 225, 255, 0.55)',
        borderWidth: 1,
        padding: 12,
        titleFont: font,
        bodyFont: font,
      },
    },
    scales: {
      x: {
        ticks: { color: '#9fb3d6', font, maxRotation: 0 },
        grid: { color: 'rgba(92, 225, 255, 0.08)' },
        border: { color: 'rgba(92, 225, 255, 0.3)' },
      },
      y: {
        ticks: { color: '#9fb3d6', font },
        grid: { color: 'rgba(92, 225, 255, 0.08)' },
        border: { color: 'rgba(92, 225, 255, 0.3)' },
        beginAtZero: true,
      },
    },
  }

  return (
    <div className="h-56 w-full">
      <Bar data={data} options={options} />
    </div>
  )
}
