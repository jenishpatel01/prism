import { features } from "@/server/config";
import { getSession, publicUser } from "@/server/session";
import Sidebar from "./Sidebar";

/** Reads the session on the server and hands the sidebar only what it may show (never the token). */
export default async function SidebarServer() {
  const session = await getSession();
  return <Sidebar user={session ? publicUser(session) : null} authEnabled={features().auth} />;
}
