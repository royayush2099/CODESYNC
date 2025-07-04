"use server";
import { currentUser } from "@clerk/nextjs/server";
import {StreamClient} from "@stream-io/node-sdk"


export const streamTokenProvider = async ()=>{
    const user = await currentUser();
    if(!user) throw new Error("User not authenticated");

    const streamClient = new StreamClient(
            process.env.NEXT_PUBLIC_STREAM_API_KEY!,
    process.env.STREAM_SECRET_KEY!
    );
      const token = streamClient.generateUserToken(
        { user_id: user.id },
       //  Math.floor(Date.now() / 1000) - 10
      );

  return token 
}

/*
✅ Let’s analyze your code:

ts
Copy
Edit
const token = streamClient.generateUserToken({ user_id: user.id });
Yes — this line is generating a Stream user token using the Stream server SDK. Under the hood, generateUserToken produces a JWT with a payload including an iat (issued at) timestamp.

Your error:

“token used before issue at (iat)”

…means that the server verifying this token thinks the iat is in the future, which usually happens due to clock drift between:

your server (where generateUserToken runs)

Stream’s infrastructure (which verifies the token)

Why this happens
When your server clock is ahead of Stream’s servers by even a few seconds, the generated iat will appear “in the future” to Stream, causing it to reject the token.

Since JWT time validation is quite strict, a few seconds of mismatch can break it.

✅ How to fix
1️⃣ Sync your server clock.
Since you are on Next.js (likely Vercel), the serverless functions should already use an NTP-synced clock, but if running locally or self-hosted, run:

bash
Copy
Edit
sudo timedatectl set-ntp true
or verify with:

bash
Copy
Edit
date
to check the correct UTC time.

2️⃣ Add a leeway buffer (recommended)

If you suspect a tiny offset in clocks, Stream’s SDK allows you to adjust the issued-at manually. For example, you could do:

ts
Copy
Edit
const token = streamClient.generateUserToken(
  { user_id: user.id },
  Math.floor(Date.now() / 1000) - 10 // 10 seconds in the past
);
👉 That sets the token’s iat 10 seconds earlier, giving a small tolerance. Stream usually accepts that perfectly.

✅ So the practical fix is to change:

ts
Copy
Edit
const token = streamClient.generateUserToken({ user_id: user.id });
to

ts
Copy
Edit
const token = streamClient.generateUserToken(
  { user_id: user.id },
  Math.floor(Date.now() / 1000) - 10 // backdate iat by 10 seconds
);
which is the simplest robust way to eliminate minor clock drift issues.

If the problem still occurs after that, then it is almost certainly a server clock misconfiguration, and you should double-check that your deployment host uses a reliable NTP service.

If you want, share your date output or your hosting setup — I can help you confirm.









Ask ChatGPT

*/