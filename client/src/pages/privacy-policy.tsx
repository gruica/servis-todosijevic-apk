import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Privacy Policy for Frigo Sistem Todosijević</CardTitle>
            <p className="text-center text-gray-600">Last Updated: 09. January 2025.</p>
          </CardHeader>
          
          <CardContent className="prose prose-gray max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
              <p>
                Welcome to Frigo Sistem Todosijević (the "App"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and its associated services.
              </p>
              <p>
                We respect your privacy and are committed to protecting your personal data. By choosing to use our App and logging in with Facebook, you agree to the collection and use of information in accordance with this policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
              <p>
                When you use Facebook Login to access our App, we may collect the following types of information from your Facebook profile, only after you explicitly grant us permission:
              </p>
              
              <div className="ml-4 space-y-4">
                <div>
                  <h3 className="font-semibold">Information from Facebook Login:</h3>
                  <ul className="list-disc ml-6 space-y-1">
                    <li><strong>Public Profile:</strong> This includes your name, profile picture, age range, gender, and your public information on Facebook.</li>
                    <li><strong>Email Address:</strong> Your primary email address associated with your Facebook account.</li>
                    <li><strong>Other Information:</strong> Any other information you agree to share with us through the Facebook permissions screen.</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold">Information We Collect Directly:</h3>
                  <ul className="list-disc ml-6 space-y-1">
                    <li><strong>App Usage Data:</strong> We may automatically collect certain information about how you interact with the App. This includes your device type, operating system, unique device identifiers, IP address, and information about your use of our features and services.</li>
                    <li><strong>User-Provided Content:</strong> Any information, content, or materials you voluntarily create or submit within the App.</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
              <p>We use the information we collect for the following purposes:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li>To create and manage your user account.</li>
                <li>To provide, maintain, and improve the core functionality of the App.</li>
                <li>To communicate with you, including sending you technical notices, updates, and support messages.</li>
                <li>To personalize and improve your experience within the App.</li>
                <li>To monitor and analyze trends and usage of the App.</li>
                <li>To detect, prevent, and address technical issues.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Legal Basis for Processing (GDPR Compliance)</h2>
              <p>If you are from the European Economic Area (EEA), our legal basis for collecting and using your information is:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>Your Consent:</strong> By granting permissions through Facebook Login, you consent to our collection and use of your information.</li>
                <li><strong>Performance of a Contract:</strong> To provide you with the services you request.</li>
                <li><strong>Legitimate Interests:</strong> To operate our App and services, provided your fundamental rights do not override those interests.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. How We Share Your Information</h2>
              <p>We do not sell, trade, or rent your personal information to third parties. We may share information in the following situations:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>Service Providers:</strong> We may share your information with third-party vendors and service providers who perform services on our behalf (e.g., cloud hosting, data analysis). These parties are obligated to keep your information confidential.</li>
                <li><strong>Legal Requirements:</strong> We may disclose your information if required to do so by law or in response to valid requests by public authorities, subject to our Government Data Request Policy outlined below.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5.1. Government Data Request Policy</h2>
              <p>We have established comprehensive policies for handling requests for personal data from government agencies and public authorities:</p>
              
              <div className="ml-4 space-y-4">
                <div>
                  <h3 className="font-semibold">Mandatory Legal Review:</h3>
                  <p>Every government data request undergoes mandatory legal review to verify its lawfulness, proper authorization, and compliance with applicable data protection laws including GDPR and local legislation.</p>
                </div>
                
                <div>
                  <h3 className="font-semibold">Challenge Procedures:</h3>
                  <p>We maintain formal procedures for challenging government data requests that we determine to be:</p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Legally insufficient or improperly authorized</li>
                    <li>Overly broad or not proportionate to the stated purpose</li>
                    <li>In violation of user privacy rights or applicable data protection laws</li>
                    <li>Lacking proper legal basis or justification</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold">Data Minimization Policy:</h3>
                  <p>When legally compelled to respond to valid government requests, we apply strict data minimization principles:</p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>We disclose only the minimum data necessary to satisfy the legal requirement</li>
                    <li>We provide the narrowest possible scope of information relevant to the specific investigation</li>
                    <li>We exclude unrelated personal data not specifically requested or legally required</li>
                    <li>We seek to provide aggregated or anonymized data when possible instead of individual records</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold">Request Documentation and Reporting:</h3>
                  <p>We maintain comprehensive documentation of all government data requests, including:</p>
                  <ul className="list-disc ml-6 space-y-1">
                    <li>Details of the requesting authority and legal basis for the request</li>
                    <li>Scope and type of data requested vs. data actually provided</li>
                    <li>Legal analysis and justification for our response</li>
                    <li>Any challenges or objections raised and their outcomes</li>
                    <li>Timeline of all communications and actions taken</li>
                  </ul>
                  <p className="mt-2">This documentation is retained for audit purposes and to ensure accountability in our data disclosure practices.</p>
                </div>
                
                <div>
                  <h3 className="font-semibold">User Notification:</h3>
                  <p>Where legally permitted, we will notify affected users about government data requests concerning their personal information, unless such notification is prohibited by law or court order.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Data Retention</h2>
              <p>
                We will retain your personal information only for as long as is necessary for the purposes set out in this Privacy Policy, to comply with our legal obligations, resolve disputes, and enforce our policies.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Your Data Protection Rights</h2>
              <p>Depending on your location, you may have the following rights regarding your personal information:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>Access and Portability:</strong> The right to request copies of your personal data.</li>
                <li><strong>Rectification:</strong> The right to request that we correct any information you believe is inaccurate.</li>
                <li><strong>Erasure ("Right to be Forgotten"):</strong> The right to request that we erase your personal data, under certain conditions.</li>
                <li><strong>Withdraw Consent:</strong> The right to withdraw your consent at any time where we relied on your consent to process your personal information.</li>
              </ul>
              <p>To exercise any of these rights, please contact us at <a href="mailto:gruica@icloud.com" className="text-blue-600 hover:underline">gruica@icloud.com</a>.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Data Security</h2>
              <p>
                We use administrative, technical, and physical security measures to help protect your personal information. However, please remember that no method of transmission over the Internet or method of electronic storage is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Children's Privacy</h2>
              <p>
                Our App is not intended for use by children under the age of 13. We do not knowingly collect personally identifiable information from children under 13. If you become aware that a child has provided us with personal information, please contact us.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Changes to This Privacy Policy</h2>
              <p>
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Contact Us</h2>
              <p>If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at:</p>
              <ul className="list-disc ml-6 space-y-1">
                <li>Email: <a href="mailto:gruica@icloud.com" className="text-blue-600 hover:underline">gruica@icloud.com</a></li>
                <li>Website: <a href="https://www.frigosistemtodosijevic.me/privacy/policy" className="text-blue-600 hover:underline">www.frigosistemtodosijevic.me/privacy/policy</a></li>
              </ul>
            </section>

            <div className="mt-8 pt-6 border-t text-center text-gray-600">
              <p>© 2025 Frigo Sistem Todosijević. All rights reserved.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}