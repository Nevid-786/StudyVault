import { Link } from 'react-router-dom'

const lastUpdated = 'November 28, 2026'

const LegalLayout = ({ title, children }) => (
  <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-800 sm:px-6">
    <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
      <nav className="mb-8 flex items-center justify-between gap-4 text-sm">
        <Link to="/" className="font-semibold text-indigo-700 hover:underline">StudyVault</Link>
        <div className="flex gap-4">
          <Link to="/privacy" className="hover:text-indigo-700">Privacy</Link>
          <Link to="/terms" className="hover:text-indigo-700">Terms</Link>
        </div>
      </nav>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: {lastUpdated}</p>
      <div className="prose prose-slate mt-8 max-w-none prose-headings:text-slate-900 prose-a:text-indigo-700">
        {children}
      </div>
      <footer className="mt-10 border-t border-slate-200 pt-5 text-sm text-slate-500">
        StudyVault is a student-developed project. <Link to="/" className="text-indigo-700 hover:underline">Return to the app</Link>
      </footer>
    </article>
  </main>
)

export const PrivacyPolicy = () => (
  <LegalLayout title="Privacy Policy">
    <p>StudyVault is a student-developed study-material organizer. This policy explains information processed when you use the hosted StudyVault application.</p>
    <h2>Information processed</h2>
    <ul>
      <li><strong>Google sign-in:</strong> When you sign in, StudyVault receives your Google account ID, email address, name, and profile image (when provided).</li>
      <li><strong>Authentication:</strong> The backend creates an authentication token and uses cookies to maintain your signed-in session. Google access tokens are used for Drive features.</li>
      <li><strong>Local study data:</strong> StudyVault stores study subjects, files, file metadata, settings, and PDF reading progress in browser IndexedDB/local storage on your device.</li>
      <li><strong>Google Drive:</strong> If you use Drive sync, StudyVault requests the Google Drive file access scope (drive.file) and uses it to manage files made available to the app.</li>
      <li><strong>AI study assistant:</strong> When you use AI features, your questions, conversation history, and relevant text extracted from selected study materials are sent to Google's Gemini API to create embeddings or generate responses.</li>
    </ul>
    <h2>How information is used</h2>
    <p>Information is used to sign you in, maintain your session, organize and sync study files when you choose Drive features, and provide AI-assisted study tools. StudyVault does not sell personal information.</p>
    <h2>Storage and third-party services</h2>
    <p>Local vault data is stored in your browser on your device. Authentication is handled by Google OAuth and our backend hosting provider. Drive sync processes files through Google Drive. AI features send relevant text and prompts to Google's Gemini service. These third-party services have their own privacy policies and terms.</p>
    <h2>Retention and deletion</h2>
    <p>Local files and data remain in your browser until you remove them or clear the browser's site data. Files synced to Google Drive are subject to your Drive account and can be managed there. StudyVault currently does not provide a complete self-service account deletion workflow. For a deletion or privacy request, contact the project owner through their GitHub profile. Do not include sensitive personal information in public GitHub issues.</p>
    <h2>Security</h2>
    <p>We use HTTPS for the hosted service and server-side authentication controls. No service or transmission method can be guaranteed completely secure. Do not upload sensitive documents that you do not want processed by the services described above.</p>
    <h2>Age eligibility</h2>
    <p>The hosted StudyVault service is intended for people aged 18 or older. It is not designed for children under 18. If you believe a child has provided personal information through the hosted service, contact the project owner so the information can be addressed.</p>
    <h2>Changes to this policy</h2>
    <p>This policy may be updated as StudyVault features or data practices change. The latest version will be published on this page.</p>
    <h2>Contact</h2>
    <p>For privacy questions or requests, contact the project owner through <a href="https://github.com/Nevid-786" target="_blank" rel="noreferrer">their GitHub profile</a>. Please do not post sensitive personal information publicly.</p>
  </LegalLayout>
)

export const TermsOfService = () => (
  <LegalLayout title="Terms of Service">
    <p>StudyVault is a student-developed application for organizing academic materials and using study tools. By using the hosted service, you agree to these terms.</p>
    <h2>Age eligibility</h2>
    <p>The hosted service is intended for users aged 18 or older. Do not use the hosted service if you are under 18.</p>
    <h2>Acceptable use</h2>
    <ul>
      <li>Use StudyVault only for lawful purposes.</li>
      <li>Upload or use content only when you have the rights or permission to do so.</li>
      <li>Do not attempt to disrupt, abuse, compromise, or gain unauthorized access to the service or its accounts.</li>
      <li>Do not use StudyVault to distribute unlawful content or infringe the rights of others.</li>
    </ul>
    <h2>Your content and backups</h2>
    <p>You remain responsible for your study materials and content. Local browser data may be lost if browser storage is cleared or your device is damaged. Keep backups of important files. Google Drive sync is optional and subject to Google's services and account terms.</p>
    <h2>AI features</h2>
    <p>AI-generated explanations may be inaccurate or incomplete. Verify important academic information against your course materials. When AI features are used, relevant prompts and study text are processed by Google's Gemini API.</p>
    <h2>Availability and changes</h2>
    <p>StudyVault is an educational project provided as-is. Features may change, be interrupted, or become unavailable. We do not guarantee uninterrupted operation, error-free results, or permanent availability of stored data.</p>
    <h2>Termination</h2>
    <p>You may stop using the service at any time. We may suspend or restrict access if necessary to protect the service, users, or comply with law.</p>
    <h2>Disclaimer and limitation</h2>
    <p>To the extent permitted by applicable law, StudyVault is provided without warranties, and the project owner is not responsible for indirect losses arising from use of the service or loss of data. Nothing in these terms excludes liability that cannot legally be excluded.</p>
    <h2>Changes to these terms</h2>
    <p>These terms may be updated as the application changes. Continued use after updates means you accept the revised terms.</p>
    <h2>Contact</h2>
    <p>Questions can be directed to the project owner through <a href="https://github.com/Nevid-786" target="_blank" rel="noreferrer">their GitHub profile</a>. Avoid posting private or sensitive details in public issues.</p>
  </LegalLayout>
)
