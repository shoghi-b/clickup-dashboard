import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function Home() {
    const cookieStore = await cookies();
    const session = cookieStore.get('session');

    if (session) {
        // If we possess a session but landed here, it means the middleware
        // didn't match the role to a dashboard.
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-2">Role Not Recognized</h1>
                    <p className="text-gray-600 mb-4">Your account is authenticated but has no assigned dashboard.</p>
                    <form action="/api/auth/logout" method="POST">
                        <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                            Logout
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    redirect('/login');
}
