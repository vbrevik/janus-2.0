// Simple test to generate bcrypt hash for testing
#[test]
fn generate_password_hash() {
    let password = "password123";
    let hash = bcrypt::hash(password, 12).expect("Failed to hash");
    println!("\n\n=== BCRYPT HASH FOR: {} ===", password);
    println!("{}", hash);
    println!("===========================\n\n");
    
    // Verify it works
    assert!(bcrypt::verify(password, &hash).expect("Failed to verify"));
}

