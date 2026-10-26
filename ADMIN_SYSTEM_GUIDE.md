# Datalab Research Consulting - Admin System Guide

## 🎯 Overview

This document describes the comprehensive order management and admin system implemented for Datalab Research Consulting. The system provides end-to-end project management from initial enquiry through to final payment and delivery.

## ✨ Key Features

### 1. **Modern Admin Dashboard**
- Clean, intuitive interface with tabbed navigation
- Real-time statistics and analytics
- Mobile-responsive design
- Dark mode friendly

### 2. **Complete Order Management**
- Track enquiries from submission to conversion
- Manage projects with status updates
- Monitor progress with percentage tracking
- Payment verification workflow

### 3. **File Upload & Management**
- Upload project files and deliverables
- Organized by categories (requirements, deliverables, revisions)
- Secure storage with Supabase Storage
- Download and delete capabilities

### 4. **Payment Tracking**
- Record deposits and balance payments
- Multiple payment methods (M-Pesa, Bank Transfer, etc.)
- Payment verification system
- Transaction reference tracking

### 5. **Project Milestones**
- Create and manage project milestones
- Track completion status
- Set due dates
- Reorder and edit on the fly

### 6. **Client Communication**
- Message system (ready for implementation)
- Admin and client visibility controls
- Communication history

## 🗂️ Database Schema Enhancements

### New Tables

#### **Enhanced `enquiries` Table**
- Added `admin_notes` for internal tracking
- Added `quoted_amount` and `quoted_at` for quotation tracking
- Added `updated_at` timestamp

#### **Enhanced `projects` Table**
```sql
- enquiry_id (link to original enquiry)
- client_name, client_phone
- description (project details)
- deposit_amount, balance_amount
- deposit_paid, balance_paid (boolean flags)
- progress_percentage (0-100)
- admin_notes
```

#### **`project_milestones` Table**
```sql
- title, description
- due_date
- completed, completed_at
- display_order
```

#### **`payments` Table**
```sql
- payment_type (deposit, balance, full, partial)
- amount
- payment_method (M-Pesa, Bank Transfer, etc.)
- transaction_reference
- payment_status (pending, verified, failed, refunded)
- verified_by, verified_at
- admin_notes
```

#### **`project_communications` Table**
```sql
- message
- sender_type (admin, client)
- sender_name
- visible_to_client
```

#### **`project_files` Table**
```sql
- file_name, file_size, file_type
- storage_path (Supabase Storage)
- uploaded_by_type (admin, client)
- file_category (requirement, deliverable, reference, revision, other)
- description
- visible_to_client
```

## 🔐 Security & Permissions

### Row Level Security (RLS)
All new tables have RLS enabled with policies:
- Staff can view and manage all records (authenticated users with staff_roles)
- Clients cannot directly access database tables
- File access controlled via signed URLs

### File Storage
- Private bucket: `project-files`
- Organized by project ID
- Signed URLs with 1-hour expiry
- Admin-controlled visibility

## 📱 Admin Features

### Dashboard (`/admin`)

#### Tabs:
1. **Enquiries** - View and manage client enquiries
2. **Projects** - Active project management
3. **Website Content** - Edit site content
4. **Analytics** - Visual analytics and reports

#### Statistics Cards:
- New Enquiries count
- Active Projects count
- Total Revenue (KES)
- Pending Payments count

#### Search & Filter:
- Search by name, email, title, reference
- Filter by status
- Real-time filtering

### Project Detail Page (`/admin/project/:id`)

#### Sidebar:
- Client avatar and contact info
- Quick statistics (Progress, Fee, Files)
- Status selector
- Progress percentage input
- Quick save button

#### Tabs:
1. **Overview** - Project details and financial information
2. **Milestones** - Track project phases and deliverables
3. **Payments** - Record and verify payments
4. **Files** - Upload and manage project files
5. **Communication** - Client-admin messaging (foundation ready)

## 🎨 Design System

### Color Palette
- **Primary Navy**: `#0d2d50`
- **Teal Accent**: `#0d8f86`
- **Success Green**: `#10b981`
- **Warning Orange**: `#f59e0b`
- **Error Red**: `#ef4444`

### Status Colors
Each status has its own color for visual distinction:
- New/In Progress: Blue
- Reviewing/Pending: Orange
- Quoted: Purple
- Accepted/Completed: Green
- Declined/Cancelled: Red
- On Hold: Gray

### Components
- Modern card-based layout
- Smooth transitions and hover effects
- Icon-driven UI using Lucide React
- Responsive grid systems

## 🚀 Setup Instructions

### 1. Database Setup

Run the enhanced schema in Supabase SQL Editor:
```bash
# Located at: supabase/schema.sql
```

This will create all tables with proper permissions.

### 2. Storage Bucket

Create a storage bucket in Supabase:
```
Bucket name: project-files
Public: No (Private)
```

### 3. Environment Variables

Ensure `.env` has:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 4. Create Staff Account

1. Go to Supabase Authentication
2. Add a user
3. Insert into `staff_roles` table:
```sql
INSERT INTO staff_roles (user_id, role)
VALUES ('user-uuid-here', 'admin');
```

Roles: `admin` or `editor`

## 📋 Workflow Example

### Client Enquiry → Project → Completion

1. **Client submits enquiry** via Contact form
2. **Admin reviews** in Dashboard → Enquiries tab
3. **Admin quotes** and updates status to "quoted"
4. **Client accepts** (update status to "accepted")
5. **Admin creates project** from enquiry
6. **Client pays deposit** → Admin records payment
7. **Admin verifies payment** → Status: "deposit_confirmed"
8. **Project starts** → Status: "in_progress"
9. **Admin uploads milestones** and tracks progress
10. **Admin uploads draft files** for review
11. **Client reviews** → Request revisions or approve
12. **Draft approved** → Request balance payment
13. **Client pays balance** → Admin verifies
14. **Admin uploads final deliverables**
15. **Project completed** → Status: "completed"

## 🛠️ API Functions

### Supabase Functions

All in `src/lib/supabase.ts`:

#### Enquiry Management
- `getAllEnquiries()` - Get all enquiries with RLS
- `updateEnquiry(id, updates)` - Update enquiry details

#### Project Management
- `getAllProjects()` - Get all projects
- `getProjectById(id)` - Get single project
- `createProject(project)` - Create new project
- `updateProject(id, updates)` - Update project

#### Milestones
- `getProjectMilestones(projectId)` - Get all milestones
- `createMilestone(milestone)` - Add milestone
- `updateMilestone(id, updates)` - Update milestone
- `deleteMilestone(id)` - Remove milestone

#### Payments
- `getProjectPayments(projectId)` - Get payment history
- `createPayment(payment)` - Record payment
- `updatePayment(id, updates)` - Verify/update payment

#### Files
- `getProjectFiles(projectId)` - Get all files
- `createProjectFile(file)` - Add file record
- `deleteProjectFile(id)` - Remove file record
- `uploadFile(file, projectId, category)` - Upload to storage
- `getFileUrl(path)` - Get signed URL
- `deleteFile(path)` - Delete from storage

## 📱 Mobile Responsiveness

The admin system is fully responsive:
- **Desktop** (1400px+): Full sidebar + main content
- **Tablet** (768px-1024px): Stacked layout, horizontal stats
- **Mobile** (<768px): Single column, touch-friendly buttons

## 🎯 Future Enhancements

### Recommended Features:
1. **Email Notifications** - Send emails on status changes
2. **Client Portal** - Allow clients to view their projects
3. **File Versioning** - Track file revisions
4. **Activity Log** - Audit trail for all changes
5. **Automated Invoicing** - Generate invoices from projects
6. **SMS Notifications** - M-Pesa payment confirmations
7. **Calendar Integration** - Deadline reminders
8. **Bulk Actions** - Operate on multiple records
9. **Advanced Analytics** - Charts and trends over time
10. **Export Reports** - PDF/Excel project reports

### Communication System
The foundation is ready in the database (`project_communications` table). To implement:
1. Add message input in Communication tab
2. Display message thread
3. Real-time updates with Supabase subscriptions
4. Email notifications on new messages

## 🔒 Best Practices

### Security
- Never commit `.env` files
- Use RLS policies for all tables
- Validate all user input
- Use signed URLs for file access
- Implement rate limiting for API calls

### Performance
- Lazy load project files
- Cache file URLs
- Paginate large datasets
- Index frequently queried columns

### UX
- Provide loading states
- Show success/error messages
- Confirm destructive actions
- Save drafts automatically
- Mobile-first design

## 📞 Support

For questions or issues:
- **Email**: datalabresearchconsulting@gmail.com
- **Phone**: +254 701 411410
- **Location**: View Park Towers, Suite 1605, Utalii Lane, Nairobi, Kenya

## 📝 License

© 2024 Datalab Research Consulting. All rights reserved.

---

**Designed & Published By**: NexxaCrafts Creative Solutions
