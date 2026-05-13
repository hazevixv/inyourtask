import os
import requests
import urllib.request
from bs4 import BeautifulSoup

def main():
    base_dir = "/home/raymaizing/Bisnis/workspace/01-raymaizing/deployments/ray-employee/database"
    html_file = os.path.join(base_dir, "employee.html")
    avatar_dir = os.path.join(base_dir, "avatar")
    sql_file = os.path.join(base_dir, "employees.sql")

    if not os.path.exists(avatar_dir):
        os.makedirs(avatar_dir)

    with open(html_file, "r", encoding="utf-8") as f:
        soup = BeautifulSoup(f.read(), "html.parser")

    rows = soup.find("tbody").find_all("tr")
    
    sql_statements = []
    sql_statements.append("CREATE DATABASE IF NOT EXISTS employee_db;")
    sql_statements.append("USE employee_db;")
    sql_statements.append("CREATE TABLE IF NOT EXISTS employees (")
    sql_statements.append("  id INT AUTO_INCREMENT PRIMARY KEY,")
    sql_statements.append("  employee_id VARCHAR(50) NOT NULL,")
    sql_statements.append("  name VARCHAR(255) NOT NULL,")
    sql_statements.append("  organization VARCHAR(255),")
    sql_statements.append("  job_position VARCHAR(255),")
    sql_statements.append("  email VARCHAR(255),")
    sql_statements.append("  avatar_path VARCHAR(255)")
    sql_statements.append(");")

    for row in rows:
        tds = row.find_all("td")
        if not tds:
            continue
        
        # Extract Image
        img_tag = tds[0].find("img", class_="avatar-photo")
        img_url = img_tag["src"] if img_tag else ""
        
        name_tag = tds[0].find("a", class_="d-block")
        name = name_tag.text.strip() if name_tag else ""
        
        employee_id = tds[1].find("span").text.strip() if tds[1].find("span") else ""
        organization = tds[2].find("span").text.strip() if tds[2].find("span") else ""
        job_position = tds[3].find("span").text.strip() if tds[3].find("span") else ""
        email = tds[4].find("span").text.strip() if len(tds) > 4 and tds[4].find("span") else ""
        
        avatar_path = ""
        if img_url:
            # Download image
            img_name = img_url.split("/")[-1]
            local_img_path = os.path.join(avatar_dir, img_name)
            
            try:
                urllib.request.urlretrieve(img_url, local_img_path)
                avatar_path = f"avatar/{img_name}"
            except Exception as e:
                print(f"Failed to download {img_url}: {e}")
        
        # Escape single quotes and create SQL INSERT
        name_esc = name.replace("'", "''")
        org_esc = organization.replace("'", "''")
        job_esc = job_position.replace("'", "''")
        email_esc = email.replace("'", "''")
        emp_id_esc = employee_id.replace("'", "''")
        
        sql = f"INSERT INTO employees (employee_id, name, organization, job_position, email, avatar_path) "
        sql += f"VALUES ('{emp_id_esc}', '{name_esc}', '{org_esc}', '{job_esc}', '{email_esc}', '{avatar_path}');"
        sql_statements.append(sql)

    with open(sql_file, "w", encoding="utf-8") as f:
        f.write("\n".join(sql_statements))
    
    print(f"Scraped {len(rows)} employees. Data written to {sql_file}")

if __name__ == "__main__":
    main()
