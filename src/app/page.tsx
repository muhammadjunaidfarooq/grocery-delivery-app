import { auth } from "@/auth";
import AdminDashboard from "@/components/AdminDashboard";
import DeliveryBoyDashboard from "@/components/DeliveryBoyDashboard";
import EditRoleMobile from "@/components/EditRoleMobile";
import GeoUpdater from "@/components/GeoUpdater";
import LandingPage from "@/components/LandingPage";
import Nav from "@/components/Nav";
import UserDashboard from "@/components/UserDashboard";
import connectDb from "@/lib/mongodb";
import User from "@/models/user.model";

export default async function Home() {
  await connectDb();
  const session = await auth();
  // Visitors who are not logged in see the public welcome page
  if (!session?.user?.id) {
    return <LandingPage />;
  }
  const user = await User.findById(session?.user?.id);
  // A leftover login cookie for a user that no longer exists is treated like
  // a guest. (Redirecting to /login here made "/" unreachable for them.)
  if (!user) {
    return <LandingPage />;
  }
  const inComplete =
    !user.mobile || !user.role || (!user.mobile && user.role == "user");
  if (inComplete) {
    return <EditRoleMobile />;
  }

  const plainUser = JSON.parse(JSON.stringify(user));

  return (
    <>
      <Nav user={plainUser} />

      <GeoUpdater userId={plainUser._id} />

      {user.role == "user" ? (
        <UserDashboard />
      ) : user.role == "admin" ? (
        <AdminDashboard />
      ) : (
        <DeliveryBoyDashboard />
      )}
    </>
  );
}
