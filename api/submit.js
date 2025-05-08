async function submitTime() {
  // Get the activation status
  const activationStatus = await fetch(`${SERVER}/api/activate`);
  const data = await activationStatus.json();

  // Get the user's name and the time they want to submit
  const userName = document.getElementById('username').value;
  const userTime = document.getElementById('time').value;
  const distance = document.getElementById('distance').value; // 'mile', 'half', 'quarter'

  // Ensure that the form fields are filled
  if (!userName || !userTime || !distance) {
    alert('Please fill in all fields.');
    return;
  }

  // Check if the requested distance is activated
  if (data.success && data.distance === distance) {
    // Proceed to submit the time if the distance is activated
    const timeData = {
      name: userName,
      time: userTime,
      distance: distance
    };

    // Submit the time to the server
    await fetch(`${SERVER}/api/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(timeData)
    }).then(response => response.json())
      .then(data => {
        if (data.success) {
          alert('Time submitted successfully!');
        } else {
          alert('Submission failed.');
        }
      })
      .catch(error => {
        console.error('Error:', error);
        alert('There was an error submitting the time.');
      });
  } else {
    // If the distance is not activated
    alert(`Activation for ${distance} is not currently active.`);
  }
}
