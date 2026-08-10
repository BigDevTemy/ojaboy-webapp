import Logo from "./Logo";

const footerGroups = [
  {
    title: "Company",
    links: [
      { label: "About Us", href: "https://ojaboy.com/about-us" },
      { label: "Contact Us", href: "https://ojaboy.com/contact-us" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Guides", href: "https://ojaboy.com/guides" },
      { label: "Terms of Service", href: "https://ojaboy.com/terms-of-service" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "https://ojaboy.com/privacy-policy" },
      { label: "Cookie Policy", href: "https://ojaboy.com/cookie-policy" },
      { label: "Refund Policy", href: "https://ojaboy.com/refund-policy" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-black/10 bg-white px-5 py-10 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm font-medium leading-6 text-black/58">
              Your personal market shopper and intelligence partner.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {footerGroups.map((group) => (
              <div key={group.title}>
                <h2 className="mb-3 text-sm font-black text-black">{group.title}</h2>
                <ul className="space-y-2">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <a className="text-sm font-medium text-black/58 hover:text-[#f10606]" href={link.href}>
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

        </div>

        <div className="mt-9 flex flex-col gap-3 border-t border-black/10 pt-6 text-sm font-medium text-black/50 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Ojaboy. All rights reserved.</p>
          <p>Built for smarter market decisions.</p>
        </div>
      </div>
    </footer>
  );
}
