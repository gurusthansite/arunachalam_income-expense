import type { Metadata } from 'next'
import { Building2, Tags, FileSpreadsheet, History } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/page-header'
import { OrgDetailsForm } from '@/components/settings/org-details-form'
import { CategoriesManager } from '@/components/settings/categories-manager'
import { ExcelFileManager } from '@/components/settings/excel-file-manager'
import { AuditLogTable } from '@/components/settings/audit-log-table'
import { getAuditLog, getCategoriesWithUsage, getSettings, getTransactions } from '@/lib/data'

export const metadata: Metadata = {
  title: 'Organization Settings',
}

interface PageProps {
  searchParams: Promise<{
    tab?: string
    welcome?: string
  }>
}

export default async function SettingsPage({ searchParams }: PageProps) {
  const params = await searchParams

  const [settings, categoriesWithUsage, txData, auditLogs] = await Promise.all([
    getSettings(),
    getCategoriesWithUsage(),
    getTransactions({ page: 1, pageSize: 1, sort: 'date', dir: 'desc' }),
    getAuditLog(30),
  ])

  const defaultTab = params.tab || (params.welcome ? 'categories' : 'general')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & Configuration"
        description="Configure organization profile, opening balance, categories, and direct Excel file storage"
      />

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="h-10 bg-muted p-1">
          <TabsTrigger value="general" className="gap-1.5 text-xs">
            <Building2 className="size-3.5" />
            <span>Organization & Balance</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-1.5 text-xs">
            <Tags className="size-3.5" />
            <span>Categories</span>
          </TabsTrigger>
          <TabsTrigger value="excel" className="gap-1.5 text-xs">
            <FileSpreadsheet className="size-3.5 text-emerald-600" />
            <span>Excel File Data</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5 text-xs">
            <History className="size-3.5" />
            <span>Audit Trail</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Organization & Balance */}
        <TabsContent value="general">
          <Card className="shadow-xs">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base">Organization Profile & Opening Balance</CardTitle>
              <CardDescription className="text-xs">
                These values define your organization's legal identity and starting ledger balance in Excel.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <OrgDetailsForm settings={settings} isAdmin={true} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Categories */}
        <TabsContent value="categories">
          <Card className="shadow-xs">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base">Income & Expense Categories</CardTitle>
              <CardDescription className="text-xs">
                Manage transaction categories saved in your Excel workbook. Categories in use cannot be permanently deleted.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <CategoriesManager categories={categoriesWithUsage} isAdmin={true} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Excel File Management */}
        <TabsContent value="excel">
          <Card className="shadow-xs">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base">Excel Storage Management</CardTitle>
              <CardDescription className="text-xs">
                All records are persisted directly to <code className="font-mono text-xs">data/ledger.xlsx</code>. Download the workbook or upload an existing spreadsheet below.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ExcelFileManager
                transactionCount={txData.total}
                categoryCount={categoriesWithUsage.length}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Audit Trail */}
        <TabsContent value="audit">
          <Card className="shadow-xs">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base">Audit Trail & Record History</CardTitle>
              <CardDescription className="text-xs">
                Log of all transaction creations, modifications, and category adjustments in the Excel ledger.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <AuditLogTable entries={auditLogs} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
