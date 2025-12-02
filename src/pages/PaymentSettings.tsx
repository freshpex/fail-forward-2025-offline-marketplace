import { useState, useEffect } from 'react';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { showSuccess, showError } from '../utils/toast';

// Nigerian banks with Paystack bank codes
const NIGERIAN_BANKS = [
  { value: '', label: 'Select Bank' },
  { value: '044', label: 'Access Bank' },
  { value: '063', label: 'Access Bank (Diamond)' },
  { value: '050', label: 'Ecobank Nigeria' },
  { value: '070', label: 'Fidelity Bank' },
  { value: '011', label: 'First Bank of Nigeria' },
  { value: '214', label: 'First City Monument Bank' },
  { value: '058', label: 'Guaranty Trust Bank' },
  { value: '030', label: 'Heritage Bank' },
  { value: '301', label: 'Jaiz Bank' },
  { value: '082', label: 'Keystone Bank' },
  { value: '101', label: 'Providus Bank' },
  { value: '076', label: 'Polaris Bank' },
  { value: '221', label: 'Stanbic IBTC Bank' },
  { value: '068', label: 'Standard Chartered Bank' },
  { value: '232', label: 'Sterling Bank' },
  { value: '032', label: 'Union Bank of Nigeria' },
  { value: '033', label: 'United Bank For Africa' },
  { value: '215', label: 'Unity Bank' },
  { value: '035', label: 'Wema Bank' },
  { value: '057', label: 'Zenith Bank' },
];

interface PaymentAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  paystack_recipient_code?: string;
  created_at: string;
}

export function PaymentSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [existingAccount, setExistingAccount] = useState<PaymentAccount | null>(null);
  
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [verifiedAccountName, setVerifiedAccountName] = useState('');

  // Load existing payment account
  useEffect(() => {
    if (!user) return;
    
    const loadAccount = async () => {
      try {
        const { data, error } = await supabase
          .from('seller_payment_accounts')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error loading payment account:', error);
        } else if (data) {
          setExistingAccount(data);
          // Find the bank code from the bank name
          const bank = NIGERIAN_BANKS.find(b => b.label === data.bank_name);
          setBankCode(bank?.value || '');
          setAccountNumber(data.account_number);
          setAccountName(data.account_name);
          setVerifiedAccountName(data.account_name);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAccount();
  }, [user]);

  // Verify account number with Paystack
  const verifyAccount = async () => {
    if (!bankCode || accountNumber.length !== 10) {
      showError('Please enter a valid 10-digit account number and select a bank');
      return;
    }

    setVerifying(true);
    try {
      // Call our Edge Function to verify the account
      const { data, error } = await supabase.functions.invoke('verify-bank-account', {
        body: {
          bank_code: bankCode,
          account_number: accountNumber,
        },
      });

      if (error) {
        showError('Failed to verify account. Please check the details.');
        setVerifiedAccountName('');
        return;
      }

      if (data?.account_name) {
        setVerifiedAccountName(data.account_name);
        setAccountName(data.account_name);
        showSuccess(`Account verified: ${data.account_name}`);
      } else {
        showError('Could not verify account. Please check the details.');
        setVerifiedAccountName('');
      }
    } catch (err) {
      console.error('Verification error:', err);
      showError('Failed to verify account');
      setVerifiedAccountName('');
    } finally {
      setVerifying(false);
    }
  };

  // Save payment account
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      showError('Please log in to save payment settings');
      return;
    }

    if (!bankCode || !accountNumber || !accountName) {
      showError('Please fill in all required fields');
      return;
    }

    if (accountNumber.length !== 10) {
      showError('Account number must be 10 digits');
      return;
    }

    setSaving(true);
    try {
      const bankLabel = NIGERIAN_BANKS.find(b => b.value === bankCode)?.label || '';

      let result;
      if (existingAccount) {
        // Update existing account - don't include user_id or timestamps
        result = await supabase
          .from('seller_payment_accounts')
          .update({
            bank_name: bankLabel,
            account_number: accountNumber,
            account_name: accountName,
          })
          .eq('id', existingAccount.id)
          .select()
          .single();
      } else {
        // Insert new account - only include required fields
        result = await supabase
          .from('seller_payment_accounts')
          .insert({
            user_id: user.id,
            bank_name: bankLabel,
            account_number: accountNumber,
            account_name: accountName,
          })
          .select()
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      setExistingAccount(result.data);
      showSuccess('Payment settings saved successfully!');
    } catch (err) {
      console.error('Save error:', err);
      showError('Failed to save payment settings');
    } finally {
      setSaving(false);
    }
  };

  // Delete payment account
  const handleDelete = async () => {
    if (!existingAccount) return;
    
    if (!confirm('Are you sure you want to remove your bank account details?')) {
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('seller_payment_accounts')
        .delete()
        .eq('id', existingAccount.id);

      if (error) throw error;

      setExistingAccount(null);
      setBankCode('');
      setAccountNumber('');
      setAccountName('');
      setVerifiedAccountName('');
      showSuccess('Bank account removed');
    } catch (err) {
      console.error('Delete error:', err);
      showError('Failed to remove bank account');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="payment-settings-page">
        <div className="container">
          <div className="loading-state">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-settings-page">
      <div className="container">
        <div className="page-header">
          <h1>Payment Settings</h1>
          {existingAccount && (
            <span className="verified-badge">✓ Account Linked</span>
          )}
        </div>

        <p className="page-description">
          Add your bank account to receive payments when buyers purchase your products.
          All payments are processed securely through our payment partner.
        </p>

        <div className="payment-form-section">
          <div className="feature-preview-card">
            <div className="preview-icon">💳</div>
            <h2>Bank Account Details</h2>
            <p className="preview-subtitle">
              Link your bank account to receive payments securely
            </p>

            <form className="payment-form" onSubmit={handleSave}>
              <Select
                label="Bank Name"
                options={NIGERIAN_BANKS}
                value={bankCode}
                onChange={(e) => {
                  setBankCode(e.target.value);
                  setVerifiedAccountName('');
                }}
              />

              <div className="account-number-group">
                <Input
                  label="Account Number"
                  type="text"
                  placeholder="10-digit account number"
                  maxLength={10}
                  value={accountNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setAccountNumber(value);
                    setVerifiedAccountName('');
                  }}
                />
                <Button
                  type="button"
                  onClick={verifyAccount}
                  disabled={verifying || !bankCode || accountNumber.length !== 10}
                  className="verify-btn"
                >
                  {verifying ? 'Verifying...' : 'Verify'}
                </Button>
              </div>

              <Input
                label="Account Holder Name"
                type="text"
                placeholder="Full name as it appears on bank account"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                disabled={!!verifiedAccountName}
              />
              
              {verifiedAccountName && (
                <div className="verified-notice">
                  ✓ Account verified: {verifiedAccountName}
                </div>
              )}

              <div className="feature-highlights">
                <div className="highlight-item">
                  <span className="highlight-icon">🔒</span>
                  <span>Bank-level security</span>
                </div>
                <div className="highlight-item">
                  <span className="highlight-icon">⚡</span>
                  <span>Fast transfers</span>
                </div>
                <div className="highlight-item">
                  <span className="highlight-icon">📊</span>
                  <span>Transaction history</span>
                </div>
              </div>

              <div className="button-group">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : existingAccount ? 'Update Details' : 'Save Payment Details'}
                </Button>
                
                {existingAccount && (
                  <Button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving}
                    className="btn-danger"
                  >
                    Remove Account
                  </Button>
                )}
              </div>
            </form>
          </div>

          <div className="info-sidebar">
            <div className="info-card">
              <h3>Why add payment details?</h3>
              <ul>
                <li>Receive payments directly in your account</li>
                <li>Automatic payment processing</li>
                <li>Secure escrow protection</li>
                <li>Built-in dispute resolution</li>
              </ul>
            </div>

            <div className="info-card">
              <h3>How payments work</h3>
              <ol className="payment-flow-list">
                <li>Buyer pays for your product</li>
                <li>Payment is held securely</li>
                <li>You prepare the order for pickup</li>
                <li>Delivery partner collects and delivers</li>
                <li>After delivery, payment is sent to you</li>
              </ol>
            </div>

            <div className="info-card">
              <h3>Need Help?</h3>
              <p>Contact our support team if you have questions about payments.</p>
              <a href="mailto:epekipoluenoch@gmail.com" className="support-link">
                📧 support@afrimarket.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
