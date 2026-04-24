export const authenticationMiddleware = (req: any, res: any, next: any) => {
  console.log("⚠️ [TESTING MODE] Bypassing JWT Auth Guard!");

  try {
    // The (req as any) forces TypeScript to let us attach the session object!
    (req as any).session = { 
        accountId: "test_account", 
        userId: "test_user", 
        shortLivedToken: process.env.MONDAY_API_TOKEN 
    };
    
    next(); 
  } catch (err) {
    console.error("Middleware crash:", err);
    res.status(500).json({ error: 'bypass failed' });
  }
};