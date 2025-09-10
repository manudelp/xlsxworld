import Image from "next/image";
import Link from "next/link";
import { FaFacebook, FaLinkedin, FaInstagram, FaTiktok } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { FaGlobe } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="w-full bg-[#292931] text-white py-16 px-4">
      <div className="container mx-auto flex flex-col gap-12">
        {/* Top Section */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-8">
          {/* Column 1 */}
          <div>
            <p className="font-semibold mb-4">PRODUCT</p>
            <ul className="space-y-3 text-sm text-white">
              <li className="hover:underline">
                <Link href="/">Home</Link>
              </li>
              <li className="hover:underline">
                <Link href="/features">Features</Link>
              </li>
              <li className="hover:underline">
                <Link href="/pricing">Pricing</Link>
              </li>
              <li className="hover:underline">
                <Link href="/tools">Tools</Link>
              </li>
              <li className="hover:underline">
                <Link href="/faq">FAQ</Link>
              </li>
            </ul>
          </div>

          {/* Column 2 */}
          <div>
            <p className="font-semibold mb-4">RESOURCES</p>
            <ul className="space-y-3 text-sm text-white">
              <li className="hover:underline">
                <Link href="/">iLoveXLSX Desktop</Link>
              </li>
              <li className="hover:underline">
                <Link href="/">iLoveXLSX Mobile</Link>
              </li>
              <li className="hover:underline">
                <Link href="/">iLoveSign</Link>
              </li>
              <li className="hover:underline">
                <Link href="/">iLoveAPI</Link>
              </li>
              <li className="hover:underline">
                <Link href="/">iLoveIMG</Link>
              </li>
            </ul>
          </div>

          {/* Column 3 */}
          <div>
            <p className="font-semibold mb-4">SOLUTIONS</p>
            <ul className="space-y-3 text-sm text-white">
              <li className="hover:underline">
                <Link href="/">Business</Link>
              </li>
              <li className="hover:underline">
                <Link href="/">Education</Link>
              </li>
            </ul>
          </div>

          {/* Column 4 */}
          <div>
            <p className="font-semibold mb-4">LEGAL</p>
            <ul className="space-y-3 text-sm text-white">
              <li className="hover:underline">
                <Link href="/">Security</Link>
              </li>
              <li className="hover:underline">
                <Link href="/">Privacy policy</Link>
              </li>
              <li className="hover:underline">
                <Link href="/">Terms & conditions</Link>
              </li>
              <li className="hover:underline">
                <Link href="/">Cookies</Link>
              </li>
            </ul>
          </div>

          {/* Column 5 */}
          <div>
            <p className="font-semibold mb-4">COMPANY</p>
            <ul className="space-y-3 text-sm text-white">
              <li className="hover:underline">
                <Link href="/">About us</Link>
              </li>
              <li className="hover:underline">
                <Link href="/">Contact us</Link>
              </li>
              <li className="hover:underline">
                <Link href="/">Blog</Link>
              </li>
              <li className="hover:underline">
                <Link href="/">Press</Link>
              </li>
            </ul>
          </div>

          {/* Column 6: App buttons */}
          <div className="flex flex-col gap-3 mt-2">
            <Image
              width={160}
              height={48}
              src="/assets/google-play-badge.svg"
              alt="Google Play"
              className="w-40"
            />
            <Image
              width={160}
              height={48}
              src="/assets/app-store-badge.svg"
              alt="App Store"
              className="w-40"
            />
            <Image
              width={160}
              height={48}
              src="/assets/mac-app-store-badge.svg"
              alt="Mac App Store"
              className="w-40"
            />
            <Image
              width={160}
              height={48}
              src="/assets/windows-store-badge.svg"
              alt="Microsoft Store"
              className="w-40"
            />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white"></div>

        {/* Bottom section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-white">
          {/* Language Selector */}
          <div className="flex items-center gap-2 border-1 rounded px-4 py-2">
            <FaGlobe />
            <select className="bg-transparent text-sm text-white">
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
            </select>
          </div>

          {/* Social Icons */}
          <div className="flex gap-5 text-2xl ml-auto">
            <FaXTwitter className="cursor-pointer hover:text-white" />
            <FaFacebook className="cursor-pointer hover:text-white" />
            <FaLinkedin className="cursor-pointer hover:text-white" />
            <FaInstagram className="cursor-pointer hover:text-white" />
            <FaTiktok className="cursor-pointer hover:text-white" />
          </div>

          {/* Copyright */}
          <div className="text-center md:text-right text-white">
            © iLoveXLSX {new Date().getFullYear()} • Your XLSX Editor
          </div>
        </div>
      </div>
    </footer>
  );
}
