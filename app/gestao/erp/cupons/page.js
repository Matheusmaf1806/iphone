import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminCoupons from '../../../../components/gestao/AdminCoupons';

export default async function CuponsAdminPage() {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('admin_session');

  if (!sessionCookie) {
    redirect('/gestao/login');
  }

  let session;
  try {
    session = JSON.parse(sessionCookie.value);
  } catch {
    redirect('/gestao/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminCoupons />
    </div>
  );
}
