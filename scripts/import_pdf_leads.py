import pdfplumber
import paramiko
import io
import re

PDF_PATH = "/home/i4yush/.gemini/antigravity-ide/brain/59f94748-6ff5-4292-9b12-697be00cb90d/media__1786048729757.pdf"
ADMIN_ID = "e6442e9b-d5f6-400d-93a9-282f2ed36369"
VPS_HOST = "187.124.98.130"
VPS_USER = "intrustindia"
VPS_PASSWORD = "Intrustdev@2026"
VPS_PORT = 22



def escape_sql_str(s):
    if not s:
        return "NULL"
    return "'" + s.replace("'", "''") + "'"

def main():
    print("Extracting leads from PDF...")
    all_leads = []
    with pdfplumber.open(PDF_PATH) as pdf:
        for i, page in enumerate(pdf.pages):
            table = page.extract_table()
            if not table:
                continue
            for row in table:
                if not row or not row[0]:
                    continue
                if row[0].startswith("User__mobile"):
                    continue
                
                # Ensure all columns exist
                row = [str(col).strip() if col else "" for col in row]
                while len(row) < 9:
                    row.append("")
                
                mobile = row[0]
                first_name = row[1]
                last_name = row[2]
                reg_store = row[3]
                last_purchased_store = row[4]
                last_txn_date = row[5]
                lifetime_purchased = row[6]
                visit_days = row[7]
                visits = row[8]
                
                contact_name = f"{first_name} {last_name}".strip()
                if not contact_name:
                    continue
                
                phone = mobile if mobile else ""
                
                notes = []
                if last_purchased_store:
                    notes.append(f"Last Purchased Store: {last_purchased_store}")
                if last_txn_date:
                    notes.append(f"Last Txn Date: {last_txn_date}")
                if visit_days:
                    notes.append(f"Visit Days: {visit_days}")
                if visits:
                    notes.append(f"Visits: {visits}")
                notes_str = " | ".join(notes)
                all_leads.append({
                    "title": contact_name,
                    "contact_name": contact_name,
                    "phone": phone,
                    "city": reg_store,
                    "notes": notes_str
                })
            print(f"Extracted page {i+1}/{len(pdf.pages)} - Total leads so far: {len(all_leads)}")
            
    print(f"Total leads extracted: {len(all_leads)}")
    
    if not all_leads:
        print("No leads extracted. Exiting.")
        return
        
    print("Generating SQL...")
    sql_batches = []
    batch_size = 500
    for i in range(0, len(all_leads), batch_size):
        batch = all_leads[i:i+batch_size]
        values = []
        for lead in batch:
            v = f"({escape_sql_str(lead['title'])}, {escape_sql_str(lead['contact_name'])}, {escape_sql_str(lead['phone'])}, {escape_sql_str(lead['city'])}, {escape_sql_str(lead['notes'])}, 'PDF Import', 'new', '{ADMIN_ID}')"
            values.append(v)
        
        insert_query = f"INSERT INTO public.crm_leads (title, contact_name, phone, city, notes, source, status, created_by) VALUES {','.join(values)};"
        sql_batches.append(insert_query)
        
    full_sql = "\n".join(sql_batches)
    
    print("Connecting to VPS via SSH...")
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(VPS_HOST, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD, timeout=30)
    sftp = c.open_sftp()
    
    print("Uploading SQL to VPS...")
    sftp.putfo(io.BytesIO(full_sql.encode()), "/tmp/import_leads_pdf.sql")
    
    print("Executing SQL in Supabase DB...")
    stdin, stdout, stderr = c.exec_command("docker exec -i supabase-db psql -U supabase_admin -d postgres < /tmp/import_leads_pdf.sql")
    
    err = stderr.read().decode()
    out = stdout.read().decode()
    if err and "ERROR:" in err:
        print("STDERR:")
        print(err)
    else:
        print("Successfully imported leads.")
        print("STDOUT SUMMARY:", out[:500] + ("..." if len(out) > 500 else ""))
        if err:
            print("STDERR (warnings):", err[:500])
        
    sftp.close()
    c.close()

if __name__ == "__main__":
    main()
