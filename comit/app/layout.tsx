import type {Metadata} from "next";
import "./globals.css";
export const metadata:Metadata={title:"COMIT × Lunes AI — Growth Operating System",description:"COMIT is the internal revenue, operations and go-to-market operating system for Lunes AI.",manifest:"/manifest.webmanifest"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}<script dangerouslySetInnerHTML={{__html:`if("serviceWorker"in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}))}`}}/></body></html>}
