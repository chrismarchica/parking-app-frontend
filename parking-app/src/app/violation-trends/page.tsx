"use client"

import * as React from "react"
import { TrendingUp, Calendar, MapPin, Download, Filter, AlertCircle, Loader2 } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ViolationChart } from "@/components/charts/violation-chart"
import { api } from "@/lib/api"
import { ViolationTrend, Borough, NYC_BOROUGHS } from "@/lib/types"
import { exportUtils } from "@/lib/utils"

export default function ViolationTrendsPage() {
  const currentYear = new Date().getFullYear()
  
  const [selectedBorough, setSelectedBorough] = React.useState<Borough>('manhattan')
  const [selectedYear, setSelectedYear] = React.useState(currentYear - 1) // Default to last year
  const [selectedMonth, setSelectedMonth] = React.useState<number | undefined>(undefined)

  // Available years (from 2018 to current year)
  const availableYears = Array.from(
    { length: currentYear - 2017 }, 
    (_, i) => currentYear - i
  )

  // Available months
  const availableMonths = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ]

  // Fetch violation trends
  const {
    data: violationTrends = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['violation-trends', selectedBorough, selectedYear, selectedMonth],
    queryFn: () => api.getViolationTrends({
      borough: selectedBorough,
      year: selectedYear,
      month: selectedMonth,
    }),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })

  // Group data for different chart types
  const chartData = React.useMemo(() => {
    if (!violationTrends.length) return { byType: [], byMonth: [], summary: [] }

    // Group by violation type
    const byType = violationTrends.reduce((acc, item) => {
      const existing = acc.find(g => g.violation_type === item.violation_type)
      if (existing) {
        existing.count += item.count
        existing.total_fines += item.total_fines
        existing.average_fine = existing.total_fines / existing.count
      } else {
        acc.push({ ...item })
      }
      return acc
    }, [] as ViolationTrend[])

    // Group by month (if not filtered by specific month)
    const byMonth = selectedMonth ? [] : violationTrends.reduce((acc, item) => {
      if (!item.month) return acc
      
      const existing = acc.find(g => g.month === item.month)
      if (existing) {
        existing.count += item.count
        existing.total_fines += item.total_fines
        existing.average_fine = existing.total_fines / existing.count
      } else {
        acc.push({ ...item })
      }
      return acc
    }, [] as ViolationTrend[])

    return {
      byType: byType.sort((a, b) => b.count - a.count),
      byMonth: byMonth.sort((a, b) => (a.month || 0) - (b.month || 0)),
      summary: violationTrends,
    }
  }, [violationTrends, selectedMonth])

  // Calculate overall statistics
  const statistics = React.useMemo(() => {
    if (!violationTrends.length) return null

    const totalViolations = violationTrends.reduce((sum, item) => sum + item.count, 0)
    const totalFines = violationTrends.reduce((sum, item) => sum + item.total_fines, 0)
    const averageFine = totalViolations > 0 ? totalFines / totalViolations : 0
    
    const mostCommonViolation = chartData.byType[0]
    const trendingUp = violationTrends.filter(item => item.trend_direction === 'up').length
    const trendingDown = violationTrends.filter(item => item.trend_direction === 'down').length

    return {
      totalViolations,
      totalFines,
      averageFine,
      mostCommonViolation,
      trendingUp,
      trendingDown,
    }
  }, [violationTrends, chartData])

  // Handle export
  const handleExport = (format: 'json' | 'csv') => {
    const exportData = {
      type: 'violation_trends' as const,
      data: violationTrends,
      filters: {
        borough: selectedBorough,
        year: selectedYear,
        month: selectedMonth,
      },
      exportDate: new Date().toISOString(),
    }

    const filename = `violation-trends-${selectedBorough}-${selectedYear}${selectedMonth ? `-${selectedMonth}` : ''}-${new Date().toISOString().split('T')[0]}`
    
    if (format === 'json') {
      exportUtils.downloadJSON(exportData, filename)
    } else {
      const csvData = violationTrends.map(trend => ({
        borough: trend.borough,
        year: trend.year,
        month: trend.month || '',
        violation_type: trend.violation_type,
        count: trend.count,
        total_fines: trend.total_fines,
        average_fine: trend.average_fine,
        trend_direction: trend.trend_direction,
        percentage_change: trend.percentage_change || '',
      }))
      exportUtils.downloadCSV(csvData, filename)
    }
  }

  const hasData = violationTrends.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Violation Trends</h1>
        <p className="text-muted-foreground">
          Analyze parking violation patterns and trends across NYC boroughs
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Borough */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Borough</label>
              <Select value={selectedBorough} onValueChange={(value: Borough) => setSelectedBorough(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NYC_BOROUGHS.map((borough) => (
                    <SelectItem key={borough} value={borough}>
                      {borough.split('_').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Year</label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Month (Optional)</label>
              <Select 
                value={selectedMonth?.toString() || 'all'} 
                onValueChange={(value) => setSelectedMonth(value === 'all' ? undefined : parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {availableMonths.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Export */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Export Data</label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('csv')}
                  disabled={!hasData}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-1" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('json')}
                  disabled={!hasData}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-1" />
                  JSON
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Data Error</span>
              <span className="text-sm">
                {error instanceof Error ? error.message : 'Failed to load violation trends'}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading violation trends...</p>
        </div>
      )}

      {/* Statistics Overview */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <div className="text-sm font-medium text-muted-foreground">Total Violations</div>
              </div>
              <div className="text-2xl font-bold mt-1">
                {statistics.totalViolations.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-red-600" />
                <div className="text-sm font-medium text-muted-foreground">Total Fines</div>
              </div>
              <div className="text-2xl font-bold mt-1">
                ${statistics.totalFines.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-green-600" />
                <div className="text-sm font-medium text-muted-foreground">Average Fine</div>
              </div>
              <div className="text-2xl font-bold mt-1">
                ${statistics.averageFine.toFixed(0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-purple-600" />
                <div className="text-sm font-medium text-muted-foreground">Most Common</div>
              </div>
              <div className="text-sm font-bold mt-1 leading-tight">
                {statistics.mostCommonViolation?.violation_type || 'N/A'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {hasData && (
        <div className="space-y-6">
          {/* Violations by Type */}
          <ViolationChart
            data={chartData.byType}
            title="Violations by Type"
            type="bar"
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Trend */}
            {chartData.byMonth.length > 0 && (
              <ViolationChart
                data={chartData.byMonth}
                title="Monthly Trend"
                type="line"
              />
            )}

            {/* Distribution Pie Chart */}
            <ViolationChart
              data={chartData.byType.slice(0, 8)}
              title="Violation Distribution"
              type="pie"
            />
          </div>
        </div>
      )}

      {/* No Data */}
      {!isLoading && !error && !hasData && (
        <Card>
          <CardContent className="p-8 text-center">
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Violation Data Found</h3>
            <p className="text-muted-foreground mb-4">
              No violation trends were found for the selected borough, year, and month.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Try adjusting your filters:</p>
              <p>• Select a different borough or year</p>
              <p>• Remove the month filter to see annual data</p>
              <p>• Check if data is available for more recent years</p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedYear(currentYear - 1)
                setSelectedMonth(undefined)
              }}
              className="mt-4"
            >
              Reset to Default Filters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Refresh Button */}
      {hasData && (
        <div className="text-center">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      )}
    </div>
  )
}