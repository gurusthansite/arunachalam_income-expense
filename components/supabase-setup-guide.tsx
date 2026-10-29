import { Database, Key, Terminal, ExternalLink, CheckCircle2, ShieldAlert } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function SupabaseSetupGuide() {
  return (
    <div className="mx-auto max-w-3xl py-12 px-4">
      <Card className="border-amber-200 shadow-sm bg-card">
        <CardHeader className="border-b bg-amber-50/50 pb-6">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-100/50">
              <ShieldAlert className="mr-1 size-3.5" /> Database Setup Required
            </Badge>
          </div>
          <CardTitle className="text-2xl mt-2">Connect Your Supabase Database</CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            This organization income and expense management application uses Supabase PostgreSQL for persistent data storage, row-level security, and audit logging.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                1
              </div>
              <div className="space-y-1">
                <h3 className="font-medium text-foreground">Create a Supabase Project</h3>
                <p className="text-sm text-muted-foreground">
                  Sign in to{' '}
                  <a
                    href="https://supabase.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline inline-flex items-center gap-1 font-medium"
                  >
                    supabase.com <ExternalLink className="size-3" />
                  </a>{' '}
                  and create a new project for your organization.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                2
              </div>
              <div className="space-y-1">
                <h3 className="font-medium text-foreground">Run Database Migrations</h3>
                <p className="text-sm text-muted-foreground">
                  Open the <strong>SQL Editor</strong> in your Supabase dashboard and run the SQL script located in:
                </p>
                <div className="mt-1 rounded-md bg-muted p-2 font-mono text-xs text-foreground flex items-center justify-between">
                  <span>supabase/schema.sql</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  This creates all tables (<code className="font-mono">organization_settings</code>, <code className="font-mono">categories</code>, <code className="font-mono">transactions</code>, <code className="font-mono">org_members</code>, <code className="font-mono">audit_logs</code>), RLS policies, audit triggers, and RPC calculation functions.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                3
              </div>
              <div className="space-y-2 w-full">
                <h3 className="font-medium text-foreground">Configure Environment Variables</h3>
                <p className="text-sm text-muted-foreground">
                  Create a <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">.env.local</code> file in the project root:
                </p>
                <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 font-mono text-xs text-zinc-100">
{`# Copy from Supabase Project Settings -> API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Server-only: Project Settings -> API -> Service Role Secret
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key`}
                </pre>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                4
              </div>
              <div className="space-y-1">
                <h3 className="font-medium text-foreground">Restart Development Server & Initialize</h3>
                <p className="text-sm text-muted-foreground">
                  Restart your Next.js server (<code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">npm run dev</code>). You will be automatically redirected to <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">/setup</code> to create the initial admin account and set up the organization!
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
