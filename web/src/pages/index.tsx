import Head from 'next/head';
import Link from 'next/link';
import { Button } from '../components/ui/button';

export default function Home() {
  return (
    <>
      <Head>
        <title>새김 (Saegim) · 배송 증빙 솔루션</title>
        <meta name="description" content="QR 기반 배송/행사 증빙 링크 생성 및 사진 인증. 클레임 방어와 CS 비용 절감을 한번에." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Header */}
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="font-bold text-xl">새김</span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/driver/login">
                <Button variant="ghost" size="sm">배송기사</Button>
              </Link>
              <Link href="/app">
                <Button size="sm">관리자 로그인</Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            QR 기반 배송 증빙 솔루션
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            배송 증빙을<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
              새기다
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            QR 스캔 한 번으로 배송 완료 사진을 기록하고,<br className="hidden md:block" />
            고객에게 실시간으로 공유하세요.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/app">
              <Button size="lg" className="px-8 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
                무료로 시작하기
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button variant="outline" size="lg" className="px-8">
                사용 방법 보기
              </Button>
            </Link>
          </div>
        </section>

        {/* Stats Section */}
        <section className="border-y bg-white">
          <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-gray-900">30초</div>
              <div className="text-sm text-gray-500 mt-1">증빙 업로드 시간</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-gray-900">100%</div>
              <div className="text-sm text-gray-500 mt-1">클레임 방어율</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-gray-900">0원</div>
              <div className="text-sm text-gray-500 mt-1">고객 앱 설치 비용</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-gray-900">24시간</div>
              <div className="text-sm text-gray-500 mt-1">자동 알림 발송</div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="max-w-6xl mx-auto px-4 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              왜 새김인가요?
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              화환, 꽃배달, 선물 배송 업체를 위한 맞춤형 증빙 솔루션
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl border p-8 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">QR 코드 스캔</h3>
              <p className="text-gray-600">
                배송 기사가 QR 코드를 스캔하면 바로 카메라가 열립니다.
                별도 앱 설치 없이 웹에서 바로 촬영.
              </p>
            </div>

            <div className="bg-white rounded-2xl border p-8 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">사진 촬영 & 업로드</h3>
              <p className="text-gray-600">
                배송 완료 사진을 촬영하고 버튼 하나로 업로드.
                자동으로 주문과 연결되어 관리됩니다.
              </p>
            </div>

            <div className="bg-white rounded-2xl border p-8 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">실시간 알림</h3>
              <p className="text-gray-600">
                카카오 알림톡으로 발주자와 수령자에게
                배송 완료 사진이 자동 전송됩니다.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="bg-gray-50 border-y">
          <div className="max-w-6xl mx-auto px-4 py-20">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                이렇게 동작해요
              </h2>
              <p className="text-gray-600">3단계로 끝나는 간단한 프로세스</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-white border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-emerald-600">
                  1
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">주문 등록 & QR 발급</h3>
                <p className="text-gray-600 text-sm">
                  관리자가 주문을 등록하면<br />
                  고유 QR 코드가 자동 생성됩니다.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-white border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-emerald-600">
                  2
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">현장에서 사진 촬영</h3>
                <p className="text-gray-600 text-sm">
                  배송 기사가 QR을 스캔하고<br />
                  배송 완료 사진을 업로드합니다.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-white border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-emerald-600">
                  3
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">고객에게 자동 알림</h3>
                <p className="text-gray-600 text-sm">
                  발주자와 수령자에게<br />
                  증빙 사진 링크가 전송됩니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="max-w-6xl mx-auto px-4 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              이런 업체에 딱이에요
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: '💐', name: '화환/꽃배달' },
              { icon: '🎁', name: '선물 배송' },
              { icon: '🍰', name: '케이크/디저트' },
              { icon: '📦', name: '일반 택배' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl border p-6 text-center hover:shadow-md transition-shadow">
                <div className="text-4xl mb-3">{item.icon}</div>
                <div className="font-medium text-gray-900">{item.name}</div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-emerald-600 to-teal-600">
          <div className="max-w-4xl mx-auto px-4 py-20 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              지금 바로 시작하세요
            </h2>
            <p className="text-emerald-100 text-lg mb-8">
              무료로 시작하고, 클레임 걱정 없는 배송 관리를 경험하세요.
            </p>
            <Link href="/app">
              <Button size="lg" variant="secondary" className="px-10 bg-white text-emerald-700 hover:bg-gray-100">
                무료 체험 시작
              </Button>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-400">
          <div className="max-w-6xl mx-auto px-4 py-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">S</span>
                </div>
                <span className="font-bold text-white">새김</span>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <Link href="/app" className="hover:text-white transition-colors">관리자</Link>
                <Link href="/driver/login" className="hover:text-white transition-colors">배송기사</Link>
                <a href="mailto:support@saegim.kr" className="hover:text-white transition-colors">문의하기</a>
              </div>
              <div className="text-sm">
                © 2024 새김. All rights reserved.
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
