import type { Metadata } from "next";
import { Search, Users } from "lucide-react";
import { AddUserForm } from "@/components/admin/add-user-form";
import { StatusToggle } from "@/components/admin/admin-buttons";
import { buttonClass } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { Avatar, Card, EmptyState, PageHeader, Pill } from "@/components/ui/misc";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Users" };

const ROLES: UserRole[] = ["super_admin", "creator", "supporter"];
const roleLabel: Record<UserRole, string> = { super_admin: "Super admin", creator: "Creator", supporter: "Supporter" };

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const { user: me } = await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.replace(/[^\p{L}\p{N}\s@._-]/gu, "").slice(0, 60).trim() : "";
  const role = ROLES.includes(sp.role as UserRole) ? (sp.role as UserRole) : "";

  const supabase = await createClient();
  let query = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200);
  if (q) query = query.or(`full_name.ilike.%${q}%,username.ilike.%${q}%,email.ilike.%${q}%`);
  if (role) query = query.eq("role", role);
  const { data: users } = await query.returns<Profile[]>();

  return (
    <>
      <PageHeader title="Users" description="All accounts on the platform. Add creators, supporters or admins with a password." action={<AddUserForm />} />
      <Card>
        <form action="/admin/users" className="flex flex-wrap gap-2 border-b border-line p-4">
          <div className="relative min-w-52 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
            <Input name="q" defaultValue={q} placeholder="Search name, username or email" className="h-10 pl-9" aria-label="Search users" />
          </div>
          <Select name="role" defaultValue={role} className="h-10 w-auto" aria-label="Role">
            <option value="">All roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
          </Select>
          <button className={buttonClass("outline", "md", "h-10")}>Filter</button>
        </form>
        {users && users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-3">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar src={u.avatar_url} name={u.full_name} size={32} />
                        <div>
                          <p className="font-medium text-ink">{u.full_name}</p>
                          <p className="text-xs text-ink-3">@{u.username} · {u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Pill tone={u.role === "super_admin" ? "brand" : "neutral"}>{roleLabel[u.role]}</Pill></td>
                    <td className="px-4 py-3"><Pill tone={u.status === "active" ? "good" : "bad"}>{u.status}</Pill></td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-2">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {u.user_id !== me.id && u.role !== "super_admin" && <StatusToggle userId={u.user_id} status={u.status} label={`@${u.username}`} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Users} title="No users found" />
        )}
      </Card>
    </>
  );
}
