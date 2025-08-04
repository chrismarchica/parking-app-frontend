"use client"

import * as React from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ViolationTrend } from "@/lib/types"

interface ViolationChartProps {
  data: ViolationTrend[]
  title: string
  type?: 'bar' | 'line' | 'pie'
  className?: string
}

export function ViolationChart({ data, title, type = 'bar', className }: ViolationChartProps) {
  // Process data for charts
  const chartData = React.useMemo(() => {
    if (type === 'pie') {
      // Group by violation type for pie chart
      const grouped = data.reduce((acc, item) => {
        const existing = acc.find(g => g.violation_type === item.violation_type)
        if (existing) {
          existing.count += item.count
          existing.total_fines += item.total_fines
        } else {
          acc.push({
            name: item.violation_type,
            value: item.count,
            count: item.count,
            total_fines: item.total_fines,
            violation_type: item.violation_type,
          })
        }
        return acc
             }, [] as Array<{
         name: string
         value: number
         count: number
         total_fines: number
         violation_type: string
       }>)
      
      return grouped.sort((a, b) => b.value - a.value).slice(0, 8) // Top 8
    }

    // For bar and line charts, group by month or violation type
    const processed = data.map(item => ({
      name: item.month ? `${item.year}-${item.month.toString().padStart(2, '0')}` : item.violation_type,
      violations: item.count,
      totalFines: item.total_fines,
      averageFine: item.average_fine,
      trend: item.trend_direction,
      borough: item.borough,
      year: item.year,
      month: item.month,
    }))

    return processed.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      if (a.month && b.month) return a.month - b.month
      return 0
    })
  }, [data, type])

  // Colors for pie chart
  const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16']

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean
    payload?: Array<{
      payload: {
        totalFines?: number
        averageFine?: number
      }
      name: string
      value: number
      color: string
    }>
    label?: string
  }) => {
    if (active && payload && payload.length) {
      
      return (
                    <div className="bg-background border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-medium">{label}</p>
          {payload.map((entry, index: number) => (
            <div key={index} className="text-sm space-y-1">
              <p style={{ color: entry.color }}>
                {entry.name}: {entry.value?.toLocaleString()}
              </p>
              {entry.payload.totalFines && (
                <p className="text-muted-foreground">
                  Total Fines: ${entry.payload.totalFines.toLocaleString()}
                </p>
              )}
              {entry.payload.averageFine && (
                <p className="text-muted-foreground">
                  Avg Fine: ${entry.payload.averageFine.toFixed(2)}
                </p>
              )}
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  // Trend indicator
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-red-500" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-green-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  // Calculate summary statistics
  const totalViolations = data.reduce((sum, item) => sum + item.count, 0)
  const totalFines = data.reduce((sum, item) => sum + item.total_fines, 0)
  const averageFine = totalViolations > 0 ? totalFines / totalViolations : 0

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="violations" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        )

      default: // bar
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="violations" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        )
    }
  }

  if (!data.length) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No data available for the selected filters
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {title}
          {data.length > 0 && data[0].trend_direction && (
            <div className="flex items-center gap-1 text-sm">
              {getTrendIcon(data[0].trend_direction)}
              <span className="capitalize">{data[0].trend_direction}</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {totalViolations.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Total Violations</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              ${totalFines.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Total Fines</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              ${averageFine.toFixed(0)}
            </div>
            <div className="text-xs text-muted-foreground">Avg Fine</div>
          </div>
        </div>

        {/* Chart */}
        <div className="w-full">
          {renderChart()}
        </div>

        {/* Legend for pie chart */}
        {type === 'pie' && chartData.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {chartData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="truncate">{item.name}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}