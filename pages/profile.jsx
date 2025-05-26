import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [hasSavedResume, setHasSavedResume] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [resumeCount, setResumeCount] = useState(0);
  const [isLoadingResumes, setIsLoadingResumes] = useState(false);
  const [userResumes, setUserResumes] = useState([]);
  
  // State for resume name editing
  const [editingResumeId, setEditingResumeId] = useState(null);
  const [editingResumeName, setEditingResumeName] = useState('');
  const [isValidatingName, setIsValidatingName] = useState(false);
  const [nameValidationError, setNameValidationError] = useState('');
  
  // State for delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // State for duplicating
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState(null);

  // Redirect to sign in page if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);
  
  // Check for localStorage resume data and pending download
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      const hasPendingDownload = localStorage.getItem('pending_resume_download') === 'true';
      
      // Only handle the specific download flow - general migration is handled by AuthGuard
      if (hasPendingDownload) {
        // Clear the pending download flag
        localStorage.removeItem('pending_resume_download');
        
        // Set flag to show success message - the actual migration happens in AuthGuard
        setHasSavedResume(true);
        
        // Redirect to subscription page for payment after a delay
        setTimeout(() => {
          router.push('/subscription');
        }, 1500);
      }

      // Fetch user's resumes from the database
      fetchUserResumes();
    }
  }, [status, session, router]);

  // Function to fetch user's resumes
  const fetchUserResumes = async () => {
    if (!session?.user?.id) return;

    setIsLoadingResumes(true);
    try {
      const response = await fetch('/api/resume/list');
      
      if (!response.ok) {
        throw new Error('Failed to fetch resumes');
      }
      
      const data = await response.json();
      console.log('User resumes:', data);
      
      setUserResumes(data.resumes || []);
      setResumeCount(data.count || 0);
      
      // If we have resumes, also set hasSavedResume for UI feedback
      if (data.count > 0) {
        setHasSavedResume(true);
      }
    } catch (error) {
      console.error('Error fetching user resumes:', error);
      toast.error('Failed to load your resumes');
    } finally {
      setIsLoadingResumes(false);
    }
  };
  
  // Start editing a resume name
  const startEditingName = (resume) => {
    setEditingResumeId(resume.id);
    setEditingResumeName(resume.title);
    setNameValidationError('');
  };
  
  // Cancel editing a resume name
  const cancelEditingName = () => {
    setEditingResumeId(null);
    setEditingResumeName('');
    setNameValidationError('');
  };
  
  // Save the edited resume name
  const saveResumeName = async () => {
    if (!editingResumeId || !editingResumeName.trim()) return;
    
    setIsValidatingName(true);
    
    try {
      // First validate the name
      const validateResponse = await fetch('/api/resume/validate-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editingResumeName.trim(),
          resumeId: editingResumeId
        }),
      });
      
      if (!validateResponse.ok) {
        throw new Error('Failed to validate resume name');
      }
      
      const validationData = await validateResponse.json();
      
      if (!validationData.isValid) {
        setNameValidationError(validationData.message || 'This name is already in use.');
        return;
      }
      
      // If name is valid, update the resume
      const updateResponse = await fetch(`/api/resume/update-name/${editingResumeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editingResumeName.trim()
        }),
      });
      
      if (!updateResponse.ok) {
        throw new Error('Failed to update resume name');
      }
      
      // Update the local state with the new name
      setUserResumes(userResumes.map(resume => 
        resume.id === editingResumeId 
          ? { ...resume, title: editingResumeName.trim() } 
          : resume
      ));
      
      // Reset editing state
      setEditingResumeId(null);
      setEditingResumeName('');
      setNameValidationError('');
      
      toast.success('Resume name updated successfully');
    } catch (error) {
      console.error('Error updating resume name:', error);
      toast.error('Failed to update resume name');
    } finally {
      setIsValidatingName(false);
    }
  };

  // Handle duplicate resume
  const handleDuplicate = async (resumeId) => {
    setIsDuplicating(true);
    setDuplicatingId(resumeId);
    
    try {
      // First, fetch the complete resume data for the resume to duplicate
      const fetchResponse = await fetch(`/api/resume/get?id=${resumeId}`);
      
      if (!fetchResponse.ok) {
        throw new Error('Failed to fetch resume data for duplication');
      }
      
      const { resume } = await fetchResponse.json();
      
      if (!resume) {
        throw new Error('Resume data not found');
      }
      
      // Create a unique title by checking existing resumes
      let baseTitle = resume.title;
      let duplicateTitle = `${baseTitle} (Copy)`;
      
      // Check if there are already copies with similar names
      const copyRegex = /\(Copy( \d+)?\)$/;
      
      // If the original title already ends with (Copy) or (Copy X), remove that part
      if (copyRegex.test(baseTitle)) {
        baseTitle = baseTitle.replace(copyRegex, '').trim();
      }
      
      // Count existing copies with similar names
      const existingCopies = userResumes.filter(r => 
        r.title.startsWith(baseTitle) && copyRegex.test(r.title)
      );
      
      // Generate a unique title
      if (existingCopies.length > 0) {
        // Find the highest copy number
        let highestNumber = 0;
        
        existingCopies.forEach(r => {
          const match = r.title.match(/\(Copy( (\d+))?\)$/);
          if (match) {
            // If it's just (Copy), consider it as 1
            const number = match[2] ? parseInt(match[2]) : 1;
            highestNumber = Math.max(highestNumber, number);
          }
        });
        
        // Create the new title with incremented number
        duplicateTitle = highestNumber === 1 
          ? `${baseTitle} (Copy 2)` 
          : `${baseTitle} (Copy ${highestNumber + 1})`;
      }
      
      // Call the API to create a duplicate - we explicitly use null for resumeId to force a new resume
      const saveResponse = await fetch('/api/resume/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: duplicateTitle,
          data: resume.data,
          template: resume.template || 'ats',
          resumeId: null // Explicitly set to null to indicate a new resume, not an update
        }),
      });
      
      if (!saveResponse.ok) {
        throw new Error('Failed to duplicate resume');
      }
      
      const saveData = await saveResponse.json();
      
      // Add the new resume to the list without a full reload
      if (saveData.resumeId) {
        const newResume = {
          id: saveData.resumeId,
          title: duplicateTitle,
          template: resume.template || 'ats',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        setUserResumes([newResume, ...userResumes]);
        setResumeCount(resumeCount + 1);
      } else {
        // If we didn't get a clean response with resumeId, do a full reload
        fetchUserResumes();
      }
      
      toast.success('Resume duplicated successfully');
    } catch (error) {
      console.error('Error duplicating resume:', error);
      toast.error('Failed to duplicate resume');
    } finally {
      setIsDuplicating(false);
      setDuplicatingId(null);
    }
  };

  // Show delete confirmation
  const confirmDelete = (resumeId) => {
    setDeleteConfirmId(resumeId);
  };

  // Cancel delete
  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  // Handle delete resume
  const handleDelete = async (resumeId) => {
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/resume/delete?id=${resumeId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete resume');
      }
      
      // Remove the resume from the list
      setUserResumes(userResumes.filter(resume => resume.id !== resumeId));
      setResumeCount(resumeCount - 1);
      
      toast.success('Resume deleted successfully');
    } catch (error) {
      console.error('Error deleting resume:', error);
      toast.error('Failed to delete resume');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmId(null);
    }
  };
  
  // Show loading state while checking authentication
  if (status === 'loading' || isTransferring) {
    return (
      <div className="container">
        <div style={{ 
          maxWidth: '800px', 
          margin: '80px auto', 
          padding: '40px', 
          textAlign: 'center',
          boxShadow: 'var(--shadow-md)', 
          borderRadius: '12px',
          background: 'white'
        }}>
          <div style={{ fontSize: '20px', marginBottom: '20px' }}>
            {isTransferring ? 'Saving your resume...' : 'Loading profile...'}
          </div>
        </div>
      </div>
    );
  }
  
  // If authenticated, show profile page
  if (session) {
    return (
      <div className="container">
        <div style={{ 
          maxWidth: '800px', 
          margin: '80px auto', 
          padding: '40px', 
          boxShadow: 'var(--shadow-md)', 
          borderRadius: '12px',
          background: 'white'
        }}>
          <h1 style={{ 
            fontSize: '28px', 
            marginBottom: '30px',
            textAlign: 'center'
          }}>
            Your Profile
          </h1>
          
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            marginBottom: '30px'
          }}>
            {session.user?.image ? (
              <img 
                src={session.user.image} 
                alt={session.user?.name || 'User'} 
                style={{ 
                  width: '100px', 
                  height: '100px', 
                  borderRadius: '50%',
                  marginBottom: '15px'
                }}
              />
            ) : (
              <div style={{ 
                width: '100px', 
                height: '100px', 
                borderRadius: '50%',
                background: 'var(--primary-blue)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '36px',
                fontWeight: 'bold',
                marginBottom: '15px'
              }}>
                {session.user?.name ? session.user.name[0].toUpperCase() : '?'}
              </div>
            )}
            
            <h2 style={{ fontSize: '24px', marginBottom: '5px' }}>
              {session.user?.name || 'User'}
            </h2>
            <p style={{ color: 'var(--text-medium)', marginBottom: '20px' }}>
              {session.user?.email}
            </p>
            
            {hasSavedResume && !router.query.action && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(52, 168, 83, 0.1), rgba(46, 204, 113, 0.1))',
                borderRadius: '8px',
                padding: '15px 20px',
                marginBottom: '20px',
                border: '1px solid rgba(52, 168, 83, 0.2)',
                maxWidth: '400px',
                textAlign: 'center'
              }}>
                <p style={{ 
                  color: '#34a853', 
                  fontSize: '16px',
                  marginBottom: '8px',
                  fontWeight: '500'
                }}>
                  Your resume has been saved to your account!
                </p>
              </div>
            )}
          </div>
          
          <div style={{
            border: '1px solid #e9ecef',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '30px'
          }}>
            <h3 style={{ 
              fontSize: '18px', 
              marginBottom: '15px',
              color: 'var(--text-dark)'
            }}>
              Account Information
            </h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '20px'
            }}>
              <div>
                <p style={{ color: 'var(--text-light)', fontSize: '14px', marginBottom: '5px' }}>
                  Subscription Status
                </p>
                <p style={{ color: 'var(--text-dark)', fontWeight: '500' }}>
                  Free Plan
                </p>
              </div>
              
              <div>
                <p style={{ color: 'var(--text-light)', fontSize: '14px', marginBottom: '5px' }}>
                  Resumes Created
                </p>
                <p style={{ color: 'var(--text-dark)', fontWeight: '500' }}>
                  {isLoadingResumes ? 'Loading...' : resumeCount}
                </p>
              </div>
              
              <div>
                <p style={{ color: 'var(--text-light)', fontSize: '14px', marginBottom: '5px' }}>
                  Account Created
                </p>
                <p style={{ color: 'var(--text-dark)', fontWeight: '500' }}>
                  {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
          
          {/* Resume List Section */}
          {userResumes.length > 0 && (
            <div 
              id="resumes"
              style={{
                marginBottom: '30px',
                border: '1px solid #e9ecef',
                borderRadius: '8px',
                padding: '20px',
              }}
            >
              <h3 style={{ 
                fontSize: '18px', 
                marginBottom: '15px',
                color: 'var(--text-dark)'
              }}>
                Your Resumes
              </h3>
              
              <div style={{
                display: 'grid',
                gap: '15px',
              }}>
                {userResumes.map(resume => (
                  <div key={resume.id} style={{
                    padding: '15px',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ flex: 1 }}>
                      {editingResumeId === resume.id ? (
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          width: '100%',
                          maxWidth: '300px'
                        }}>
                          <input
                            type="text"
                            value={editingResumeName}
                            onChange={(e) => setEditingResumeName(e.target.value)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '4px',
                              border: '1px solid #ccc',
                              marginBottom: nameValidationError ? '5px' : '0'
                            }}
                            placeholder="Resume name"
                          />
                          {nameValidationError && (
                            <p style={{ 
                              color: '#e74c3c', 
                              fontSize: '12px', 
                              margin: '5px 0'
                            }}>
                              {nameValidationError}
                            </p>
                          )}
                          <div style={{ 
                            display: 'flex', 
                            gap: '10px',
                            marginTop: '8px'
                          }}>
                            <button
                              onClick={saveResumeName}
                              disabled={isValidatingName || !editingResumeName.trim()}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '4px',
                                background: 'var(--primary-blue)',
                                color: 'white',
                                border: 'none',
                                fontSize: '14px',
                                cursor: 'pointer',
                                opacity: isValidatingName || !editingResumeName.trim() ? '0.7' : '1'
                              }}
                            >
                              {isValidatingName ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={cancelEditingName}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '4px',
                                background: 'transparent',
                                color: 'var(--text-medium)',
                                border: '1px solid #dee2e6',
                                fontSize: '14px',
                                cursor: 'pointer'
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <p style={{ fontWeight: '500', marginBottom: '5px' }}>
                            {resume.title}
                          </p>
                          <button
                            onClick={() => startEditingName(resume)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-light)',
                              fontSize: '14px',
                              cursor: 'pointer',
                              padding: '4px 8px',
                              marginLeft: '10px'
                            }}
                            title="Edit resume name"
                          >
                            ✎
                          </button>
                        </div>
                      )}
                      <p style={{ fontSize: '14px', color: 'var(--text-light)' }}>
                        Last updated: {new Date(resume.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    
                    {/* Actions Buttons */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {deleteConfirmId === resume.id ? (
                        <div style={{ 
                          display: 'flex', 
                          gap: '8px',
                          background: 'rgba(231, 76, 60, 0.1)',
                          padding: '8px 10px',
                          borderRadius: '6px'
                        }}>
                          <p style={{ 
                            fontSize: '14px', 
                            color: '#e74c3c',
                            marginRight: '8px',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            Delete this resume?
                          </p>
                          <button 
                            onClick={() => handleDelete(resume.id)}
                            disabled={isDeleting}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              background: '#e74c3c',
                              color: 'white',
                              border: 'none',
                              fontSize: '13px',
                              cursor: 'pointer',
                              opacity: isDeleting ? '0.7' : '1'
                            }}
                          >
                            {isDeleting ? 'Deleting...' : 'Yes'}
                          </button>
                          <button 
                            onClick={cancelDelete}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              background: 'transparent',
                              color: 'var(--text-medium)',
                              border: '1px solid #dee2e6',
                              fontSize: '13px',
                              cursor: 'pointer'
                            }}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleDuplicate(resume.id)}
                            disabled={isDuplicating && duplicatingId === resume.id}
                            style={{
                              textDecoration: 'none',
                              padding: '8px',
                              borderRadius: '6px',
                              background: 'transparent',
                              color: 'var(--text-medium)',
                              border: '1px solid #dee2e6',
                              fontSize: '14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              opacity: (isDuplicating && duplicatingId === resume.id) ? '0.7' : '1',
                              transition: 'all 0.2s ease',
                            }}
                            title="Duplicate resume"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                          </button>
                          
                          <Link href={`/resume/edit/${resume.id}`} style={{
                            textDecoration: 'none',
                            padding: '8px 15px',
                            borderRadius: '6px',
                            background: 'var(--primary-blue)',
                            color: 'white',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"></path>
                              <polygon points="18 2 22 6 12 16 8 16 8 12 18 2"></polygon>
                            </svg>
                            Edit
                          </Link>
                          
                          <button
                            onClick={() => confirmDelete(resume.id)}
                            style={{
                              textDecoration: 'none',
                              padding: '8px',
                              borderRadius: '6px',
                              background: 'transparent',
                              color: '#e74c3c',
                              border: '1px solid rgba(231, 76, 60, 0.3)',
                              fontSize: '14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                            title="Delete resume"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center',
            gap: '15px', 
            marginTop: '30px',
            flexWrap: 'wrap'
          }}>
            <Link href="/subscription" className="btn btn-primary" style={{ 
              textDecoration: 'none',
              padding: '12px 25px',
              borderRadius: '8px',
              background: 'var(--primary-blue)',
              color: 'white',
              border: 'none',
              fontWeight: '500',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                <line x1="1" y1="10" x2="23" y2="10"></line>
              </svg>
              Pricing
            </Link>
            
            <button 
              onClick={() => signOut({ callbackUrl: '/' })}
              className="btn btn-outline"
              style={{ 
                padding: '12px 25px',
                borderRadius: '8px',
                background: 'transparent',
                color: 'var(--text-medium)',
                border: '1px solid #dee2e6',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                fontFamily: "'Figtree', 'Inter', sans-serif",
                hover: {
                  background: 'rgba(229, 62, 62, 0.08)',
                  color: '#e53e3e',
                  borderColor: 'rgba(229, 62, 62, 0.3)',
                }
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(229, 62, 62, 0.08)';
                e.currentTarget.style.color = '#e53e3e';
                e.currentTarget.style.borderColor = 'rgba(229, 62, 62, 0.3)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-medium)';
                e.currentTarget.style.borderColor = '#dee2e6';
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // If not authenticated but not redirected yet, show login prompt
  return (
    <div className="container">
      <div style={{ 
        maxWidth: '800px', 
        margin: '80px auto', 
        padding: '40px', 
        textAlign: 'center',
        boxShadow: 'var(--shadow-md)', 
        borderRadius: '12px',
        background: 'white'
      }}>
        <div style={{ fontSize: '20px', marginBottom: '20px' }}>
          Please sign in to view your profile
        </div>
        <Link href="/auth/signin" style={{
          display: 'inline-block',
          padding: '12px 25px',
          background: 'var(--primary-blue)',
          color: 'white',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: '500'
        }}>
          Sign In
        </Link>
      </div>
    </div>
  );
} 