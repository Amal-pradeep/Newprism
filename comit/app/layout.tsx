import type {Metadata} from "next";
import "./globals.css";
export const metadata:Metadata={title:"COMIT — Prism of Stories",description:"AI business operating system for Prism of Stories.",manifest:"/manifest.webmanifest"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}<script dangerouslySetInnerHTML={{__html:`if("serviceWorker"in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}))}`}}/></body></html>}
