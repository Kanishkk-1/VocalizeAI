import React, { useState, useRef, useEffect } from 'react'
import { FaMicrophone, FaVolumeUp } from 'react-icons/fa'
import { gsap } from 'gsap'
import styles from './VoiceButton.module.css' // Make sure this path is correct

const VoiceButton = ({ onClick, isRecording }) => {
  const buttonRef = useRef(null)
  const wavesRef = useRef(null)

  // Effect to handle animations based on isListening state change
  useEffect(() => {
    const timeline = gsap.timeline()
    console.log('isRecording:', isRecording)
    if (isRecording) {
      // Ensure refs are attached
      if (buttonRef.current && wavesRef.current) {
        timeline
          .to(buttonRef.current, {
            background: 'linear-gradient(to right, #cc5c55, #b22222)', // Darker gradient when active
            duration: 0.4,
          })
          .to(
            wavesRef.current,
            {
              opacity: 1,
              scale: 1.5,
              duration: 1.5,
              repeat: -1,
              ease: 'sine.inOut',
            },
            '<'
          )
      }
    } else {
      if (buttonRef.current && wavesRef.current) {
        timeline
          .to(buttonRef.current, {
            background: 'linear-gradient(to right, #00b4db, #0083b0)',
            duration: 0.4,
          })
          .to(wavesRef.current, {
            opacity: 0,
            scale: 1,
            duration: 0.4,
          })
      }
    }
  }, [isRecording]) // Dependency array includes isListening to trigger effect on change

  return (
    <div className={styles['voice-button-container']}>
      <div className={styles.callout}>
        {isRecording ? 'Speak now' : 'Tap to Speak'}
      </div>
      <button
        onClick={onClick}
        ref={buttonRef}
        className={`${styles['voice-button']} ${
          isRecording ? styles.recording : ''
        }`}>
        {isRecording ? (
          <FaVolumeUp className={styles.icon} />
        ) : (
          <FaMicrophone className={styles.icon} />
        )}
      </button>
      <div ref={wavesRef} className={styles['voice-animation']}></div>
    </div>
  )
}

export default VoiceButton
