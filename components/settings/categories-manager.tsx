'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Power, AlertTriangle, ShieldCheck, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  createCategory,
  deleteCategory,
  renameCategory,
  setCategoryActive,
} from '@/app/actions/settings'
import type { CategoryWithUsage, TxType } from '@/lib/types'

interface CategoriesManagerProps {
  categories: CategoryWithUsage[]
  isAdmin: boolean
}

export function CategoriesManager({ categories, isAdmin }: CategoriesManagerProps) {
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<TxType>('expense')
  const [addingOpen, setAddingOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [renamingCat, setRenamingCat] = useState<CategoryWithUsage | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const [deletingCat, setDeletingCat] = useState<CategoryWithUsage | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const filteredCategories = categories.filter((c) => c.type === activeTab)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newCatName.trim()) return

    setIsSubmitting(true)
    try {
      const res = await createCategory({
        name: newCatName.trim(),
        type: activeTab,
      })
      if (!res.ok) {
        toast.error(res.error)
      } else {
        toast.success(res.message || 'Category created')
        setNewCatName('')
        setAddingOpen(false)
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message || 'Error creating category.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault()
    if (!renamingCat || !renameValue.trim()) return

    setIsSubmitting(true)
    try {
      const res = await renameCategory(renamingCat.id, renameValue.trim())
      if (!res.ok) {
        toast.error(res.error)
      } else {
        toast.success(res.message || 'Category renamed')
        setRenamingCat(null)
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message || 'Error renaming category.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleToggleActive(cat: CategoryWithUsage, nextActive: boolean) {
    try {
      const res = await setCategoryActive(cat.id, nextActive)
      if (!res.ok) {
        toast.error(res.error)
      } else {
        toast.success(res.message)
        router.refresh()
      }
    } catch (err: any) {
      toast.error('Error changing category status.')
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingCat) return
    setIsDeleting(true)
    try {
      const res = await deleteCategory(deletingCat.id)
      if (!res.ok) {
        toast.error(res.error)
      } else {
        toast.success(res.message || 'Category deleted')
        setDeletingCat(null)
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message || 'Error deleting category.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Type Toggle & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={activeTab === 'expense' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('expense')}
            className={`h-9 text-xs ${activeTab === 'expense' ? 'bg-rose-700 hover:bg-rose-800 text-white' : ''}`}
          >
            Expense Categories ({categories.filter((c) => c.type === 'expense').length})
          </Button>
          <Button
            type="button"
            variant={activeTab === 'income' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('income')}
            className={`h-9 text-xs ${activeTab === 'income' ? 'bg-emerald-700 hover:bg-emerald-800 text-white' : ''}`}
          >
            Income Categories ({categories.filter((c) => c.type === 'income').length})
          </Button>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={() => setAddingOpen(true)}
          className="h-9 gap-1.5 text-xs self-start"
        >
          <Plus className="size-4" />
          <span>Add {activeTab === 'expense' ? 'Expense' : 'Income'} Category</span>
        </Button>
      </div>

      {/* Categories List */}
      <div className="divide-y rounded-lg border bg-card">
        {filteredCategories.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No categories defined for {activeTab}. Click "Add Category" above to create one.
          </div>
        ) : (
          filteredCategories.map((cat) => {
            const hasUsage = cat.usage_count > 0
            return (
              <div
                key={cat.id}
                className="flex items-center justify-between p-3.5 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <Tag className="size-4 text-muted-foreground shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${!cat.is_active ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                        {cat.name}
                      </span>
                      {!cat.is_active && (
                        <Badge variant="outline" className="text-[10px] py-0 h-4 text-muted-foreground border-muted-foreground/30">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {hasUsage
                        ? `Used in ${cat.usage_count} transaction${cat.usage_count === 1 ? '' : 's'}`
                        : 'No transactions recorded'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Active Toggle Switch */}
                  <div className="flex items-center gap-2" title={cat.is_active ? 'Active in forms' : 'Hidden from forms'}>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {cat.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <Switch
                      checked={cat.is_active}
                      onCheckedChange={(checked) => handleToggleActive(cat, checked)}
                    />
                  </div>

                  {/* Rename */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setRenamingCat(cat)
                      setRenameValue(cat.name)
                    }}
                    title="Rename category"
                  >
                    <Pencil className="size-3.5" />
                    <span className="sr-only">Rename</span>
                  </Button>

                  {/* Delete (with safeguards) */}
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`size-8 ${
                        hasUsage
                          ? 'text-muted-foreground/40 cursor-not-allowed'
                          : 'text-muted-foreground hover:text-destructive'
                      }`}
                      disabled={hasUsage}
                      onClick={() => !hasUsage && setDeletingCat(cat)}
                      title={
                        hasUsage
                          ? `Cannot delete: used in ${cat.usage_count} transactions. Deactivate it instead.`
                          : 'Delete unused category'
                      }
                    >
                      <Trash2 className="size-3.5" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Add Category Dialog */}
      <Dialog open={addingOpen} onOpenChange={setAddingOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Add {activeTab === 'expense' ? 'Expense' : 'Income'} Category</DialogTitle>
              <DialogDescription className="text-xs">
                Enter the name for the new category to organize ledger entries.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <label htmlFor="cat_name" className="text-xs font-medium block mb-1.5">
                Category Name
              </label>
              <Input
                id="cat_name"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Office Stationery, Audit Fees, Grants"
                maxLength={60}
                required
                className="h-10"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddingOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating…' : 'Create Category'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename Category Dialog */}
      <Dialog open={Boolean(renamingCat)} onOpenChange={(open) => !open && setRenamingCat(null)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleRename}>
            <DialogHeader>
              <DialogTitle>Rename Category</DialogTitle>
              <DialogDescription className="text-xs">
                Update the name of this category. Historical transactions will reflect the updated name.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <label htmlFor="rename_val" className="text-xs font-medium block mb-1.5">
                Category Name
              </label>
              <Input
                id="rename_val"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                maxLength={60}
                required
                className="h-10"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenamingCat(null)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation Dialog */}
      <AlertDialog open={Boolean(deletingCat)} onOpenChange={(open) => !open && setDeletingCat(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category "{deletingCat?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This category has 0 associated transactions and can be safely deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={handleDeleteConfirm}
            >
              {isDeleting ? 'Deleting…' : 'Delete Category'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
