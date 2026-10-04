"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { pageSchema, type PageInput } from "@/lib/page-schema";

async function adminContext() {
  const session = await getSession();
  if (!session || session.profile.role !== "super_admin" || session.profile.status !== "active") throw new Error("Forbidden");
  return { supabase: await createClient(), adminId: session.user.id };
}

export async function savePage(input: PageInput): Promise<ActionState & { id?: string }> {
  const parsed = pageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  const v = parsed.data;
  const { supabase, adminId } = await adminContext();

  const row = {
    title: v.title,
    slug: v.slug,
    meta_description: v.metaDescription || null,
    content: v.content,
    status: v.status,
    show_in_footer: v.showInFooter,
    sort_order: v.sortOrder,
    updated_by: adminId,
  };

  const { data: before } = v.id
    ? await supabase.from("pages").select("slug").eq("id", v.id).maybeSingle()
    : { data: null };

  const { data, error } = v.id
    ? await supabase.from("pages").update(row).eq("id", v.id).select("id").single()
    : await supabase.from("pages").insert(row).select("id").single();

  if (error) {
    if (error.code === "23505") return { ok: false, fieldErrors: { slug: ["Another page already uses this address"] } };
    return { ok: false, message: error.message };
  }

  await supabase.from("admin_activity_logs").insert({
    admin_id: adminId,
    action: v.id ? "update_page" : "create_page",
    entity_type: "page",
    entity_id: data.id,
    description: `${v.id ? "Updated" : "Created"} page /${v.slug} (${v.status})`,
  });

  revalidatePath("/", "layout");
  if (before?.slug && before.slug !== v.slug) revalidatePath(`/${before.slug}`);
  return { ok: true, message: v.status === "published" ? "Page saved and published." : "Draft saved.", id: data.id };
}

export async function deletePage(id: string) {
  if (!z.uuid().safeParse(id).success) return;
  const { supabase, adminId } = await adminContext();
  const { data } = await supabase.from("pages").delete().eq("id", id).select("slug").maybeSingle();
  if (data) {
    await supabase.from("admin_activity_logs").insert({
      admin_id: adminId, action: "delete_page", entity_type: "page", entity_id: id, description: `Deleted page /${data.slug}`,
    });
  }
  revalidatePath("/", "layout");
  redirect("/admin/pages");
}
