# Datalab Project Management Workflow Guide

## Complete Payment & Delivery Workflow

This document explains the end-to-end workflow from client submission to final delivery with payment gates.

---

## 🎯 Overview

The system implements a structured workflow:
1. **Client submits project** → Gets submission reference
2. **Admin reviews & accepts** → Converts to project, sets pricing
3. **Client receives project reference** → Can track progress
4. **Client pays deposit** → Work begins
5. **Admin uploads watermarked draft** → Client reviews (view-only)
6. **Client approves draft & pays balance** → Admin verifies payment
7. **Admin uploads final files** → Client downloads clean version

---

## 📋 Setup Instructions

### 1. Database Setup

Run these SQL files in your Supabase SQL Editor in order:

```sql
-- 1. Main schema (if not already applied)
-- Run: supabase/schema.sql

-- 2. Add watermark fields
-- Run: supabase/add-watermark-fields.sql
```

### 2. Storage Bucket Setup

Create storage bucket in Supabase:
- **Bucket name**: `project-files`
- **Privacy**: Private
- **Policies**:
  - Allow authenticated users to upload
  - Allow authenticated users to select

---

## 🔄 Complete Workflow

### Phase 1: Client Submission

**Location**: `/submit-project`

1. Client fills out project submission form
2. Client can upload files (optional, max 5 files, 10MB each)
3. System generates reference like `SUB-A1B2C3D4E5`
4. Files stored in `project-files/submissions/{submission_id}/`

**Database**:
- Record created in `project_submissions` table
- Files tracked in `submission_files` table

---

### Phase 2: Admin Review & Accept

**Location**: `/admin` → Submissions tab

1. Admin views new submission
2. Admin clicks **"Accept"** button
3. Modal appears to set:
   - Total Fee (KES)
   - Deposit Amount (KES) 
   - Balance Amount (auto-calculated)
   - Agreed Deadline (optional)
   - Admin Notes (optional)

4. System creates:
   - New project with reference `DRC-2026-XXXX`
   - Copies submission files to project
   - Updates submission status to "converted"
   - Sets project status to "awaiting_deposit"

5. **Admin must share project reference with client** (via email/phone)

**Database**:
- New record in `projects` table
- Files copied to `project_files` table
- Submission marked as converted

---

### Phase 3: Client Tracking

**Location**: `/track-project`

Client enters their project reference number (no email needed):

**Can See**:
- Project status
- Progress percentage
- Milestones completed
- Payment status (Deposit & Balance)
- Files available for review/download

**Can Do**:
- Submit deposit payment
- Submit balance payment
- View watermarked drafts
- Download final files (after balance paid)

---

### Phase 4: Deposit Payment

**Client Side** (`/track-project`):
1. Click "Submit Deposit Payment"
2. Select payment method (M-Pesa, Bank Transfer, Card, Other)
3. Make payment externally
4. Enter transaction reference
5. Submit to system

**Admin Side** (`/admin/project/{id}` → Payments tab):
1. See new payment with status "pending"
2. Verify payment externally (check M-Pesa, bank account)
3. Click "Verify Payment"
4. System updates:
   - Payment status → "verified"
   - Project `deposit_paid` → true
   - Admin can change project status to "in_progress"

---

### Phase 5: Work & Draft Upload

**Admin Actions** (`/admin/project/{id}` → Files tab):

1. Work on project
2. Create watermarked draft (add watermark externally)
3. Click **"Upload Draft (Watermarked)"**
4. Select watermarked file
5. Update project status to "awaiting_draft_review"

**System automatically sets**:
- `file_category`: "draft_watermarked"
- `is_watermarked`: true
- `is_downloadable`: false (view-only)
- `requires_balance_payment`: false
- `visible_to_client`: true

**Client sees**: File marked as "Watermarked Preview" with view icon only (no download)

---

### Phase 6: Draft Review & Balance Payment

**Client Reviews** (`/track-project`):
1. Sees watermarked draft file
2. Can view (open in browser) but not download
3. If approved, clicks "Submit Balance Payment"
4. Follows same payment flow as deposit

**Admin Verifies** (`/admin/project/{id}` → Payments):
1. Sees balance payment "pending"
2. Verifies externally
3. Clicks "Verify Payment"
4. System updates:
   - Payment status → "verified"
   - Project `balance_paid` → true
   - Admin can change status to "final_deliverables_available"

---

### Phase 7: Final Delivery

**Admin Uploads Final** (`/admin/project/{id}` → Files):
1. Click **"Upload Final File"**
2. Select clean version (no watermark)
3. File uploaded with settings:
   - `file_category`: "final"
   - `is_watermarked`: false
   - `is_downloadable`: true
   - `requires_balance_payment`: true
   - `visible_to_client`: true

4. Update project status to "completed"

**Client Downloads** (`/track-project`):
1. File shows as "Requires Balance Payment" badge initially
2. After balance verified, badge disappears
3. Download button becomes active
4. Client can download clean final files
5. Files sent to client email for permanent access

---

## 🎨 Admin Dashboard Features

### Convert Submission to Project

When admin clicks "Accept" on a submission:

```typescript
Modal Fields:
- Total Fee (KES) *required
- Deposit Amount (KES) *required
- Balance Amount (auto-calculated = Total - Deposit)
- Agreed Deadline (optional)
- Admin Notes (optional)

On Submit:
✓ Creates project with new reference DRC-YYYY-XXXX
✓ Copies all submission files to project
✓ Marks submission as "converted"
✓ Shows success message with project reference
✓ Refreshes dashboard
```

### File Upload Categories

```
1. Upload Draft (Watermarked)
   - For client review
   - View-only (no download)
   - Not blocked by payment

2. Upload Final File
   - Clean version
   - Downloadable only after balance paid
   - Replaces watermarked version

3. Upload Other
   - Supporting documents
   - Regular files
   - Downloadable immediately
```

---

## 📊 Project Statuses

| Status | Meaning | Next Action |
|--------|---------|-------------|
| `awaiting_deposit` | Project accepted, waiting for deposit | Client pays deposit |
| `deposit_confirmed` | Deposit verified | Admin starts work |
| `in_progress` | Work ongoing | Admin uploads draft |
| `awaiting_draft_review` | Draft sent to client | Client reviews |
| `revision_requested` | Client wants changes | Admin revises |
| `draft_approved` | Client approved draft | Client pays balance |
| `awaiting_balance_payment` | Waiting for final payment | Client pays balance |
| `payment_verification_pending` | Payment submitted, pending verification | Admin verifies |
| `final_deliverables_available` | Clean files ready | Client downloads |
| `completed` | Project finished | Archive/close |
| `on_hold` | Paused temporarily | Resume or cancel |
| `cancelled` | Project cancelled | Archive |

---

## 🔐 Access Control

### Client (No Authentication)
- **Can Access**: `/track-project` with reference number only
- **Can View**: Their project status, milestones, payments, files
- **Can Submit**: Deposit payment, balance payment
- **Can Download**: Final files (after balance paid)

### Admin (Authenticated)
- **Can Access**: `/admin` dashboard
- **Can Manage**: All submissions, projects, contacts
- **Can Convert**: Submissions to projects
- **Can Upload**: Files with watermark controls
- **Can Verify**: Payments

---

## 📁 File Storage Structure

```
project-files/
├── submissions/
│   └── {submission_id}/
│       ├── file1.pdf
│       └── file2.docx
│
└── {project_id}/
    ├── draft_watermarked/
    │   └── draft-watermarked-{timestamp}.pdf
    ├── final/
    │   └── final-clean-{timestamp}.pdf
    └── other/
        └── reference-{timestamp}.pdf
```

---

## 🎯 Key Features

### Watermark Workflow
- ✅ Draft files marked as watermarked
- ✅ View-only (no download) for watermarked files
- ✅ Final files require balance payment
- ✅ Download enabled only after payment verified

### Payment Tracking
- ✅ Separate deposit and balance tracking
- ✅ Client submits payment details
- ✅ Admin verifies externally
- ✅ System unlocks features after verification

### Client Portal
- ✅ Track with reference number only (no email)
- ✅ Real-time project status
- ✅ Milestone progress
- ✅ Payment status
- ✅ File access control

### Admin Control
- ✅ Accept/convert submissions
- ✅ Set pricing and deadlines
- ✅ Upload categorized files
- ✅ Verify payments
- ✅ Full project management

---

## 🚀 Testing Workflow

### 1. Test Submission
```
1. Go to /submit-project
2. Fill form with test data
3. Upload 1-2 test files
4. Submit and note reference (e.g., SUB-ABC123)
```

### 2. Test Admin Accept
```
1. Sign in to /admin
2. Go to Submissions tab
3. Click "Accept" on test submission
4. Enter: Total Fee=50000, Deposit=25000
5. Note project reference (e.g., DRC-2026-001)
```

### 3. Test Client Tracking
```
1. Go to /track-project
2. Enter project reference DRC-2026-001
3. See status: "Awaiting Deposit"
4. Click "Submit Deposit Payment"
5. Fill payment details with test transaction ref
```

### 4. Test Admin Verification
```
1. Go to /admin/project/{id}
2. Payments tab → See pending deposit
3. Click "Verify Payment"
4. Status changes to deposit_paid=true
```

### 5. Test Draft Upload
```
1. Admin Files tab
2. Click "Upload Draft (Watermarked)"
3. Upload watermarked PDF
4. Client sees: "Watermarked Preview" badge, view icon only
```

### 6. Test Balance Payment
```
1. Client clicks "Submit Balance Payment"
2. Fills payment form
3. Admin verifies payment
4. Status changes to balance_paid=true
```

### 7. Test Final Delivery
```
1. Admin clicks "Upload Final File"
2. Uploads clean PDF
3. Client sees download icon
4. Client can download final file
```

---

## 🐛 Troubleshooting

### Client can't see project
- ✅ Check reference number is correct (case-sensitive)
- ✅ Verify project exists in database
- ✅ Check `projects` table has the reference

### Payment not showing
- ✅ Check `payments` table for record
- ✅ Verify payment_status is "pending" or "verified"
- ✅ Check project_id matches

### File not downloadable
- ✅ Check `is_downloadable` is true
- ✅ If `requires_balance_payment` is true, verify balance_paid
- ✅ Check storage bucket permissions

### Can't convert submission
- ✅ Verify admin is authenticated
- ✅ Check submission status is "new"
- ✅ Verify pricing fields are filled

---

## 📞 Support

For issues or questions:
- Check browser console for error messages
- Verify Supabase connection in .env
- Check SQL schema is fully applied
- Ensure storage bucket is created

---

**Last Updated**: December 2024
**Version**: 1.0
**System**: Datalab Research Consulting Website
