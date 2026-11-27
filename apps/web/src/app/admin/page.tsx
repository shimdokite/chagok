import { AdminReview } from "../../components/admin/AdminReview";

export const metadata = { title: "차곡 · 복지비 신청 관리" };
export const dynamic = "force-dynamic";

export default function AdminPage() {
  return <AdminReview clientId={process.env.GOOGLE_WEB_CLIENT_ID ?? ""} />;
}
