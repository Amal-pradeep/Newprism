export const teamUsers = [
  { email: process.env.COMIT_AMAL_EMAIL || "amalpradeep25@gmail.com", name: "Amal" },
  { email: process.env.COMIT_AADIL_EMAIL || "aadil.sudhir279@gmail.com", name: "Aadil" },
  { email: process.env.COMIT_ANEESH_EMAIL || "msaneeshnath@gmail.com", name: "Aneesh" },
  { email: process.env.COMIT_JISHNU_EMAIL || "jishnu.01010011@gmail.com", name: "Jishnu" },
  { email: process.env.COMIT_SHAHID_EMAIL || "shahidruiz01@gmail.com", name: "Shahid" },
];
export function teamUser(email: string) {
  return teamUsers.find(user => user.email.toLowerCase() === email.trim().toLowerCase());
}
