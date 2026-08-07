import Header from "../components/Header";

type Props = {
    children: React.ReactNode;
};

export default function DashboardLayout({
    children,
}: Props) {
    return (
        <>
            <Header />

            <main>
                {children}
            </main>
        </>
    ); 
}