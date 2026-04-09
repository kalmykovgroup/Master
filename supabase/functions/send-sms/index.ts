// Supabase Edge Function: send-sms
// Sends OTP codes via SMS.ru API
// Configure in Supabase Dashboard -> Auth -> Phone Provider -> Hook URL

const SMS_RU_API_ID = Deno.env.get('SMS_RU_API_ID') ?? '';
const SMS_RU_TEST_MODE = Deno.env.get('SMS_RU_TEST_MODE') ?? '1';

interface SmsHookPayload {
  phone: string;
  otp: string;
}

Deno.serve(async (req: Request) => {
  try {
    const payload: SmsHookPayload = await req.json();
    const {phone, otp} = payload;

    if (!phone || !otp) {
      return new Response(
        JSON.stringify({error: 'Missing phone or otp'}),
        {status: 400, headers: {'Content-Type': 'application/json'}},
      );
    }

    const message = `Your verification code: ${otp}`;

    const params = new URLSearchParams({
      api_id: SMS_RU_API_ID,
      to: phone,
      msg: message,
      json: '1',
      test: SMS_RU_TEST_MODE,
    });

    const response = await fetch(
      `https://sms.ru/sms/send?${params.toString()}`,
    );

    const result = await response.json();

    if (result.status === 'OK') {
      return new Response(
        JSON.stringify({success: true}),
        {status: 200, headers: {'Content-Type': 'application/json'}},
      );
    }

    return new Response(
      JSON.stringify({error: 'SMS send failed', details: result}),
      {status: 500, headers: {'Content-Type': 'application/json'}},
    );
  } catch (error) {
    return new Response(
      JSON.stringify({error: 'Internal error', message: String(error)}),
      {status: 500, headers: {'Content-Type': 'application/json'}},
    );
  }
});
