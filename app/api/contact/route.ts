import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL ?? 'contact@fairtide.app';
const CONTACT_FROM_EMAIL = process.env.CONTACT_FROM_EMAIL ?? 'Fair Tide <contact@fairtide.app>';

export async function POST(request: Request) {
  const redirectUrl = new URL('/contact', request.url);

  try {
    const formData = await request.formData();
    const name = readField(formData, 'name');
    const email = readField(formData, 'email');
    const message = readField(formData, 'message', 5000);

    if (!name || !isValidEmail(email) || !message) {
      redirectUrl.searchParams.set('sent', '0');
      return NextResponse.redirect(redirectUrl, 303);
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('Contact form submission failed: RESEND_API_KEY is not configured.');
      redirectUrl.searchParams.set('sent', '0');
      return NextResponse.redirect(redirectUrl, 303);
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: CONTACT_FROM_EMAIL,
        to: CONTACT_TO_EMAIL,
        reply_to: email,
        subject: `Fair Tide contact form: ${name}`,
        text: buildPlainText({ name, email, message }),
        html: buildHtml({ name, email, message })
      })
    });

    if (!response.ok) {
      console.error('Contact form submission failed:', await response.text());
      redirectUrl.searchParams.set('sent', '0');
      return NextResponse.redirect(redirectUrl, 303);
    }

    redirectUrl.searchParams.set('sent', '1');
    return NextResponse.redirect(redirectUrl, 303);
  } catch (error) {
    console.error('Contact form submission failed:', error);
    redirectUrl.searchParams.set('sent', '0');
    return NextResponse.redirect(redirectUrl, 303);
  }
}

function readField(formData: FormData, key: string, maxLength = 200) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function buildPlainText({ name, email, message }: { name: string; email: string; message: string }) {
  return [
    'New Fair Tide contact form submission',
    '',
    `Name: ${name}`,
    `Email: ${email}`,
    '',
    'Message:',
    message
  ].join('\n');
}

function buildHtml({ name, email, message }: { name: string; email: string; message: string }) {
  return `
    <h2>New Fair Tide contact form submission</h2>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(message).replace(/\n/g, '<br />')}</p>
  `;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
