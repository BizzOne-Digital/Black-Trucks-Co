'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Phone, Mail, MapPin, Clock, Send } from 'lucide-react';

const contactInfo = [
  { icon: Phone, title: 'Phone', lines: ['647-706-6325'], sub: 'Available 24/7' },
  { icon: Mail, title: 'Email', lines: ['Blacktrucksco@hotmail.com'], sub: "We'll respond within 24 hours" },
  { icon: MapPin, title: 'Location', lines: ['Toronto, Ontario'], sub: 'Serving GTA & surrounding areas' },
  { icon: Clock, title: 'Hours', lines: ['24/7 Service Available'], sub: 'Office: Mon–Fri, 9AM–6PM' },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to send message');
      setSubmitted(true);
      setForm({ name: '', email: '', phone: '', message: '' });
      setTimeout(() => setSubmitted(false), 5000);
    } catch {
      setSubmitError('Failed to send message. Please try again or call us directly.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white">

      {/* Hero */}
      <div className="relative h-[100svh] min-h-[600px] bg-black">
        <Image src="/Gallery (9).jpg" alt="Contact Us" fill className="object-cover object-[center_25%] sm:object-center" priority sizes="100vw" />
        <div className="absolute inset-0 bg-black/70" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-6 pt-16 sm:pt-28">
          <p className="text-xs font-semibold tracking-widest uppercase mb-2 text-white">Reach Out</p>
          <h1 className="text-2xl sm:text-5xl md:text-6xl font-bold mb-2">Get in Touch</h1>
          <p className="text-xs sm:text-base text-white max-w-md">We're here to provide a seamless luxury experience</p>
        </div>
      </div>

      {/* Contact info cards */}
      <div className="bg-black text-white py-10 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {contactInfo.map(({ icon: Icon, title, lines, sub }, i) => (
            <div key={i} className="text-center">
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Icon className="h-5 w-5 text-white" />
              </div>
              <p className="font-semibold text-sm mb-1">{title}</p>
              {lines.map((l, j) => <p key={j} className="text-gray-300 text-xs sm:text-sm">{l}</p>)}
              {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Form + side panel */}
      <div className="flex flex-col lg:flex-row">
        {/* Form */}
        <div className="w-full lg:w-1/2 px-6 sm:px-10 lg:px-16 py-14">
          <p className="text-xs font-medium tracking-widest uppercase text-gray-600 mb-2">Send a Message</p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-8">How Can We Help?</h2>

          {submitted && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm font-medium">Thank you! We'll get back to you shortly.</p>
            </div>
          )}
          {submitError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{submitError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Full Name</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="John Doe"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Phone</label>
                <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 transition-colors" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required placeholder="john@example.com"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Message</label>
              <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} required rows={5} placeholder="Tell us how we can help..."
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 transition-colors resize-none" />
            </div>
            <button type="submit" disabled={submitting} className="flex items-center gap-2 bg-black hover:bg-gray-800 disabled:opacity-50 text-white px-6 py-3 rounded text-sm font-medium transition-colors">
              <Send className="h-4 w-4" /> {submitting ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>

        {/* Side image + quick actions */}
        <div className="w-full lg:w-1/2 flex flex-col">
          <div className="relative flex-1 min-h-[280px] sm:min-h-[360px]">
            <Image src="/Corporate Transportation.jpeg" alt="Service area" fill className="object-cover" />
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white text-center px-4">
              <MapPin className="h-10 w-10 mb-3 opacity-80" />
              <h3 className="text-xl sm:text-2xl font-bold mb-1">Service Area</h3>
              <p className="text-sm text-gray-200">Serving Los Angeles and surrounding areas</p>
            </div>
          </div>
          <div className="bg-gray-50 px-8 py-8 flex flex-col sm:flex-row gap-4">
            <a href="tel:6477066325" className="flex-1 flex items-center justify-center gap-2 bg-black hover:bg-gray-800 text-white px-5 py-3 rounded text-sm font-medium transition-colors">
              <Phone className="h-4 w-4" /> Call Now
            </a>
            <Link href="/booking" className="flex-1 flex items-center justify-center gap-2 border border-gray-300 hover:border-gray-600 text-black px-5 py-3 rounded text-sm font-medium transition-colors">
              Book a Ride
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}



