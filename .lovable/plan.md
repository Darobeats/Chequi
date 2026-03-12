

## Two Critical Issues to Fix

### Issue 1: Reset not working for QR attendees

**Root Cause**: The `useResetControlUsage` function (line 220-252 of `useSupabaseData.ts`) deletes from `control_usage` table filtered by `attendee_id`. The edge function `process-qr-scan` calls `validate_control_access_public` which counts rows in `control_usage` for the attendee. After reset, when the attendee is scanned again, the validation function should allow access since usage count is now 0.

However, the edge function response handling has a subtle issue: when the edge function returns a 403 status (access denied), `supabase.functions.invoke` treats non-2xx responses differently. Let me verify the actual flow:

- The edge function inserts into `control_usage` on success (line 365-372 of process-qr-scan)
- Reset deletes from `control_usage` by `attendee_id`
- Next scan: `validate_control_access_public` should see 0 uses and allow access

The real problem is likely that the edge function returns 403 for denied access, and `supabase.functions.invoke` may throw the response body as an error rather than returning it as data. But for the "reset not working" issue — I need to check if the `useProcessQRCode` hook properly handles the 403 response. Looking at lines 189-210: when `error` is set, it throws, losing the detailed response. But more importantly, if the 403 response data includes `canAccess: false` in `data`, it should still be accessible.

Wait — re-reading the edge function: on 403, it returns `success: false` but NOT `canAccess`. The normalized response (line 199) does `canAccess: Boolean(data?.canAccess ?? data?.success)` — so `canAccess` would be `false` since `success` is `false`. But the issue is that `supabase.functions.invoke` with a non-2xx status code sets `error` AND `data` may be null.

**Actually, the real issue**: `supabase.functions.invoke` returns `{ data, error }` where for non-2xx responses, `error` contains the response body and `data` is null. So on 403, the code at line 189 catches it and throws a generic error, losing the attendee details. But this doesn't explain "reset not working" — it should still allow access after reset.

Let me reconsider: Perhaps the user is talking about the **cédula** system reset, not the QR system. The cédula system uses `cedula_control_usage` table with a UNIQUE constraint `(event_id, numero_cedula, control_type_id)`. There is NO reset function for `cedula_control_usage` at all. The `useResetControlUsage` only resets `control_usage` (QR system). So if the user resets and re-scans a cédula, the `cedula_control_usage` record still exists and the duplicate constraint fires.

But if the user is talking about QR ticket reset — the `control_usage` records are deleted, and the `cedula_registros` insert would fail with duplicate. Let me check `cedula_registros` — it has a UNIQUE constraint too.

**Most likely scenario**: The user resets via the AttendeesManager (which deletes from `control_usage`), then re-scans the QR ticket. The `validate_control_access_public` should return `can_access: true` since usage is now 0. Then the edge function inserts into `control_usage` — this should work. But the `useProcessQRCode` hook also invalidates queries. This should work.

Unless the issue is with caching or the `supabase.functions.invoke` error handling for 403 responses. Let me look at this more carefully.

Actually, I think the issue might be simpler: the edge function uses `supabaseClient` with SERVICE_ROLE_KEY, so RLS is bypassed. The `validate_control_access_public` counts `control_usage` rows. After reset (delete), count should be 0. This should work.

But wait — the `useResetControlUsage` uses the **client** supabase (with RLS). The RLS for `control_usage` DELETE says... there's NO delete policy! Looking at the schema: `control_usage` has "Can't DELETE records from the table". So the reset mutation silently fails because RLS blocks the delete!

**That's the bug!** The `control_usage` table has no DELETE RLS policy, so `useResetControlUsage` always fails silently (the Supabase client doesn't throw on RLS-blocked deletes when using `.delete()` — it just deletes 0 rows).

### Issue 2: Auto-scroll to top on mobile scanner

**Root Cause**: In the QRScanner component, when `scanning` state changes (start → stop after QR detected), the conditional rendering switches between `ScannerVideo` → `ScanResult` → back to `ScannerVideo`. These component swaps cause the DOM to re-layout, and on mobile, the browser may scroll to maintain focus or due to the content height change.

Additionally, when `lastResult` auto-clears after 3.5-4 seconds (line 217-221), the component switches from `ScanResult` back to `ScannerVideo`, which has different height — causing a layout shift that triggers scroll-to-top.

The fix: prevent scroll jumps by giving the scanner area a fixed minimum height and using CSS to prevent scroll restoration on state changes.

---

### Plan

#### Fix 1: Add DELETE policy for `control_usage` table
Create a migration adding a DELETE RLS policy so admins and control users can delete `control_usage` records. This makes the reset function actually work.

**File**: New migration SQL
```sql
CREATE POLICY "Admin and control can delete control usage"
ON public.control_usage
FOR DELETE
TO public
USING (
  user_has_role_secure(auth.uid(), 'admin'::user_role) 
  OR user_has_role_secure(auth.uid(), 'control'::user_role)
);
```

#### Fix 2: Prevent auto-scroll on mobile scanner
**Files to modify**:
- `src/components/QRScanner.tsx` — Add a fixed min-height wrapper around the conditional render area (ScanResult / CameraPermissions / ScannerVideo) to prevent layout shifts. Also add `overflow-anchor: none` CSS.
- `src/components/scanner/ScannerVideo.tsx` — Add a fixed min-height to prevent height changes when switching between idle/scanning states.
- `src/pages/Scanner.tsx` — Ensure the main content area doesn't trigger scroll reset on re-renders. Change the `overflow-y-auto` to use a scroll container that maintains position.

The key technique: wrap the conditional render block in a div with `min-h-[400px]` (matching the scanner video height) so that swapping between ScanResult/ScannerVideo doesn't change the page height and trigger scroll.

