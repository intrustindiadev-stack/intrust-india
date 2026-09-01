import paramiko

host = '187.124.98.130'
user = 'intrustindia'
password = 'Intrustdev@2026'
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password, timeout=10)

node_script = """
require("dotenv").config({ path: "/home/intrustindia/intrust-india/.env" });
const jwt = require("jsonwebtoken");

async function testPAN() {
    const baseUrl = process.env.SPRINT_VERIFY_BASE_URL || "https://uat.paysprint.in/sprintverify-uat/api/v1";
    const endpoint = process.env.SPRINT_VERIFY_PAN_ENDPOINT || "/verification/pan_verify";
    const url = baseUrl.replace(/\\/+$/, "") + "/" + endpoint.replace(/^\\/+/, "");
    
    const jwtKey = process.env.SPRINT_VERIFY_JWT_KEY;
    const partnerId = process.env.SPRINT_VERIFY_PARTNER_ID;
    const authKey = process.env.SPRINT_VERIFY_AUTHORIZED_KEY;
    
    if (!jwtKey || !partnerId || !authKey) {
        console.log("Missing keys.");
        return;
    }
    
    const timestamp = Math.floor(Date.now() / 1000);
    const token = jwt.sign({ timestamp, partnerId, reqid: Date.now().toString() }, jwtKey, { algorithm: "HS256" });
    
    const payload = { pannumber: "AAFCI6648A", refid: Date.now().toString() };
    
    console.log("Calling:", url);
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Token": token,
            "authorisedkey": authKey
        },
        body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}
testPAN();
"""

stdin, stdout, stderr = ssh.exec_command(f"echo '{password}' | sudo -S bash -c 'cat > /tmp/test_pan.js && cd /home/intrustindia/intrust-india && node /tmp/test_pan.js'")
stdin.write(node_script)
stdin.close()

print(stdout.read().decode('utf-8'))
if stderr.read(): print('ERR', stderr.read().decode('utf-8'))
