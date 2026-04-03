import AppLayout from "../components/layout/AppLayout";

const Home: React.FC = () => {
  return (
    <AppLayout>
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
        <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
        <p className="text-gray-600">
          Selamat datang di halaman utama aplikasi Next.js Anda.
        </p>
      </div>
    </AppLayout>
  );
};

export default Home;
