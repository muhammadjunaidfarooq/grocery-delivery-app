import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import connectDb from "./lib/mongodb";
import User from "./models/user.model";
import bcrypt from "bcryptjs";
import Google from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        await connectDb();

        // 1. Safety check for credentials
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please provide both email and password");
        }

        const email = String(credentials.email).trim().toLowerCase();
        const password = credentials.password as string;

        // 2. Find user and include password (since we set select: false in the model)
        const user = await User.findOne({ email }).select("+password");

        if (!user) {
          throw new Error("User does not exist");
        }

        if (!user.password) {
          throw new Error(
            "This account was created with Google. Please sign in with Google.",
          );
        }

        // 2. Now TypeScript knows 'user.password' is a string.
        // Use 'as string' on the credentials password just to be 100% safe.
        const isMatch = await bcrypt.compare(password as string, user.password);

        if (!isMatch) {
          throw new Error("Invalid password");
        }

        // 4. IMPORTANT: You MUST return the user object for the session to be created
        return {
          id: String(user._id),
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        await connectDb();
        let dbUser = await User.findOne({ email: user.email });

        if (!dbUser) {
          dbUser = await User.create({
            name: user.name,
            email: user.email,
            image: user.image || "",
          });
        }

        // Attach DB data to the user object for the JWT/Session callbacks
        user.id = dbUser._id.toString();
        user.role = dbUser.role;
      }
      return true;
    },

    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.role = user.role;
      }
      // When the browser calls update(), refresh the role from the database.
      // Never use data sent by the client: it could say { role: "admin" }.
      if (trigger === "update" && token.id) {
        await connectDb();
        const dbUser = await User.findById(token.id).select("role");
        if (dbUser) {
          token.role = dbUser.role;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 10 * 24 * 60 * 60, // 10 days, in seconds
  },
  secret: process.env.AUTH_SECRET,
});
