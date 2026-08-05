import { withAuth } from "next-auth/middleware";

const authProxy = withAuth({
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ req, token }) {
      if (!token) {
        return false;
      }

      const pathname = req.nextUrl.pathname;

      if (pathname.startsWith("/organizer")) {
        return token.role === "ORGANIZER";
      }

      if (pathname.startsWith("/artist")) {
        return token.role === "ARTIST";
      }

      if (pathname.startsWith("/judge")) {
        return token.role === "JUDGE";
      }

      return true;
    },
  },
});

export default function proxy(...args: Parameters<typeof authProxy>) {
  return authProxy(...args);
}

export const config = {
  matcher: ["/organizer/:path*", "/artist/:path*", "/judge/:path*"],
};
